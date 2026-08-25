import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendAppointmentNotifications } from "@/lib/appointment-notifications";
import { audit, requirePermission } from "@/lib/security";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requirePermission("appointment:manage");
  if (access.response) return access.response;
  const user = access.user as any;

  const { action } = await req.json();
  if (!["confirm", "reject"].includes(action)) {
    return NextResponse.json({ error: "Choose confirm or reject." }, { status: 400 });
  }

  const appointmentRequest = await prisma.appointmentRequest.findUnique({
    where: { id: params.id },
    include: { doctor: { select: { id: true, name: true } }, organization: { select: { name: true } } },
  });
  if (!appointmentRequest) return NextResponse.json({ error: "Appointment request not found." }, { status: 404 });

  const canRespond = appointmentRequest.organizationId === user.organizationId &&
    (user.role !== "DOCTOR" || appointmentRequest.doctorId === user.id);
  if (!canRespond) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (appointmentRequest.status !== "PENDING") {
    return NextResponse.json({ error: "This appointment request has already been reviewed." }, { status: 409 });
  }

  const updated = await prisma.appointmentRequest.update({
    where: { id: params.id },
    data: { status: action === "confirm" ? "CONFIRMED" : "REJECTED", respondedAt: new Date() },
    include: { doctor: { select: { id: true, name: true } } },
  });

  const notifications = action === "confirm" ? await sendAppointmentNotifications({
    patientName: appointmentRequest.patientName,
    patientEmail: appointmentRequest.patientEmail,
    organizationName: appointmentRequest.organization.name,
    doctorName: appointmentRequest.doctor.name,
    scheduledAt: appointmentRequest.requestedAt,
    durationMinutes: appointmentRequest.durationMinutes,
    reason: appointmentRequest.reason,
  }) : undefined;
  await audit({ organizationId: appointmentRequest.organizationId, userId: user.id, action: action === "confirm" ? "APPOINTMENT_REQUEST_CONFIRMED" : "APPOINTMENT_REQUEST_REJECTED", resourceType: "AppointmentRequest", resourceId: appointmentRequest.id, request: req });

  return NextResponse.json({ request: updated, notifications });
}

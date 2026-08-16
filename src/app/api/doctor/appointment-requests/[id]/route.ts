import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendAppointmentNotifications } from "@/lib/appointment-notifications";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (!["DOCTOR", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { action } = await req.json();
  if (!["confirm", "reject"].includes(action)) {
    return NextResponse.json({ error: "Choose confirm or reject." }, { status: 400 });
  }

  const appointmentRequest = await prisma.appointmentRequest.findUnique({
    where: { id: params.id },
    include: { doctor: { select: { id: true, name: true } }, organization: { select: { name: true } } },
  });
  if (!appointmentRequest) return NextResponse.json({ error: "Appointment request not found." }, { status: 404 });

  const canRespond = user.role === "SUPER_ADMIN" ||
    (user.role === "DOCTOR" && appointmentRequest.doctorId === user.id) ||
    (user.role === "ADMIN" && appointmentRequest.organizationId === user.organizationId);
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

  return NextResponse.json({ request: updated, notifications });
}

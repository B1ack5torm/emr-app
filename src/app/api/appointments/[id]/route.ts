import { AppointmentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";
import { AppointmentState, canTransitionAppointment } from "@/lib/domain/appointments";

const actionStatus: Record<string, AppointmentState> = {
  cancel: "CANCELLED",
  "check-in": "CHECKED_IN",
  "start-consultation": "IN_CONSULTATION",
  complete: "COMPLETED",
  "no-show": "NO_SHOW",
};

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requirePermission("appointment:manage");
  if (access.response) return access.response;
  const user = access.user as any;
  const appointment = await prisma.appointment.findFirst({
    where: { id: params.id, organizationId: user.organizationId },
    include: { visit: { select: { id: true, signedAt: true } } },
  });
  if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

  const body = await req.json();
  const nextStatus = actionStatus[body.action];
  const reason = String(body.reason || "").trim();
  if (!nextStatus) return NextResponse.json({ error: "Unsupported appointment action." }, { status: 400 });
  if (nextStatus === "CANCELLED" && !reason) return NextResponse.json({ error: "A cancellation reason is required." }, { status: 400 });
  if (!canTransitionAppointment(appointment.status as AppointmentState, nextStatus)) return NextResponse.json({ error: `Cannot change appointment from ${appointment.status} to ${nextStatus}.` }, { status: 409 });
  if (nextStatus === "COMPLETED" && !appointment.visit?.signedAt) return NextResponse.json({ error: "Finalize the encounter before completing the appointment." }, { status: 409 });

  const result = await prisma.$transaction(async (tx) => {
    let visit = appointment.visit;
    if (nextStatus === "CHECKED_IN" && !visit) {
      visit = await tx.visit.create({ data: { patientId: appointment.patientId, doctorId: appointment.doctorId, chiefComplaint: appointment.reason, appointmentId: appointment.id } });
    }
    const updated = await tx.appointment.update({ where: { id: appointment.id }, data: { status: nextStatus as AppointmentStatus } });
    await tx.appointmentStatusHistory.create({ data: { appointmentId: appointment.id, previousStatus: appointment.status, newStatus: nextStatus as AppointmentStatus, reason: reason || null, changedById: user.id } });
    return { appointment: updated, visit };
  });
  await audit({ organizationId: user.organizationId, userId: user.id, patientId: appointment.patientId, action: `APPOINTMENT_${nextStatus}`, resourceType: "Appointment", resourceId: appointment.id, reason: reason || undefined, request: req });
  return NextResponse.json(result);
}

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendAppointmentNotifications } from "@/lib/appointment-notifications";
import { audit, requirePermission } from "@/lib/security";
import { slotsOverlap, validateAppointmentTime } from "@/lib/domain/appointments";
import { isTimeWithinWorkingPeriods } from "@/lib/domain/scheduling";

export async function GET(req: NextRequest) {
  const access = await requirePermission("appointment:manage");
  if (access.response) return access.response;
  const session = { user: access.user } as any;
  const organizationId = (session.user as any).organizationId;
  const date = req.nextUrl.searchParams.get("date");
  const start = date ? new Date(`${date}T00:00:00`) : new Date();
  if (Number.isNaN(start.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  const end = new Date(start); end.setDate(end.getDate() + 1);

  const [appointments, onlineAppointments, doctors] = await Promise.all([
    prisma.appointment.findMany({
      where: { organizationId, scheduledAt: { gte: start, lt: end } },
      include: { patient: { select: { id: true, name: true, mrn: true, phone: true, email: true } }, doctor: { select: { id: true, name: true } } },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.appointmentRequest.findMany({
      where: { organizationId, status: { in: ["CONFIRMED", "CHECKED_IN", "CANCELLED", "NO_SHOW"] }, requestedAt: { gte: start, lt: end } },
      include: { doctor: { select: { id: true, name: true } } },
      orderBy: { requestedAt: "asc" },
    }),
    prisma.user.findMany({ where: { organizationId, role: "DOCTOR", status: "ACTIVE" }, select: { id: true, name: true, practitionerProfile: { select: { specialty: true, clinic: { select: { id: true, name: true, appointmentTypes: { where: { active: true }, select: { id: true, name: true, durationMinutes: true } } } } } } }, orderBy: { name: "asc" } }),
  ]);
  const schedule = [
    ...appointments.map((appointment) => ({ ...appointment, source: "INTERNAL" as const })),
    ...onlineAppointments.map((appointment) => ({
      id: appointment.id,
      scheduledAt: appointment.requestedAt,
      durationMinutes: appointment.durationMinutes,
      reason: appointment.reason,
      statusReason: appointment.statusReason,
      status: appointment.status,
      source: "ONLINE" as const,
      patient: { id: "", name: appointment.patientName, mrn: "Online request", phone: appointment.patientPhone, email: appointment.patientEmail },
      doctor: appointment.doctor,
    })),
  ].sort((left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime());
  return NextResponse.json({ appointments: schedule, doctors });
}

export async function POST(req: NextRequest) {
  const access = await requirePermission("appointment:create");
  if (access.response) return access.response;
  const session = { user: access.user } as any;
  const organizationId = (session.user as any).organizationId;
  const { patientId, doctorId, appointmentTypeId, scheduledAt, durationMinutes, reason, contactEmail } = await req.json();
  const startsAt = new Date(scheduledAt);
  if (!patientId || !scheduledAt) return NextResponse.json({ error: "Patient and appointment time are required." }, { status: 400 });
  const patient = await prisma.patient.findFirst({ where: { id: patientId, organizationId } });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  const doctor = doctorId ? await prisma.user.findFirst({ where: { id: doctorId, organizationId, role: "DOCTOR", status: "ACTIVE" }, select: { name: true, practitionerProfile: { select: { id: true, clinicId: true, schedules: { where: { dayOfWeek: startsAt.getDay(), active: true }, include: { breaks: true } } } } } }) : null;
  if (doctorId && !doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  const appointmentType = appointmentTypeId && doctor?.practitionerProfile ? await prisma.appointmentType.findFirst({ where: { id: appointmentTypeId, organizationId, clinicId: doctor.practitionerProfile.clinicId, active: true } }) : null;
  if (appointmentTypeId && !appointmentType) return NextResponse.json({ error: "Appointment type not found." }, { status: 404 });
  const duration = appointmentType?.durationMinutes || Number(durationMinutes);
  const timeError = validateAppointmentTime(startsAt, duration);
  if (timeError) return NextResponse.json({ error: timeError }, { status: 400 });
  if (doctor?.practitionerProfile) {
    const dayStart = new Date(startsAt); dayStart.setHours(0, 0, 0, 0); const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
    const [blocked, holiday] = await Promise.all([
      prisma.blockedPeriod.findMany({ where: { practitionerId: doctor.practitionerProfile.id, startsAt: { lt: new Date(startsAt.getTime() + duration * 60_000) }, endsAt: { gt: startsAt } }, select: { startsAt: true, endsAt: true } }),
      prisma.holiday.findFirst({ where: { clinicId: doctor.practitionerProfile.clinicId, date: { gte: dayStart, lt: dayEnd } }, select: { id: true } }),
    ]);
    const periods = doctor.practitionerProfile.schedules.map((schedule) => ({ startMinute: schedule.startMinute, endMinute: schedule.endMinute, appointmentMinutes: duration, slotIntervalMinutes: schedule.appointmentMinutes, breaks: schedule.breaks }));
    if (holiday || !isTimeWithinWorkingPeriods(startsAt, duration, periods, blocked)) return NextResponse.json({ error: "That time is outside the practitioner’s availability." }, { status: 409 });
  }
  const endsAt = new Date(startsAt.getTime() + duration * 60_000);
  const email = contactEmail?.trim() || patient.email;
  let appointment;
  try {
    appointment = await prisma.$transaction(async (tx) => {
      if (doctorId) {
        const [appointments, requests] = await Promise.all([
          tx.appointment.findMany({ where: { doctorId, status: { notIn: ["CANCELLED", "RESCHEDULED", "NO_SHOW"] }, scheduledAt: { lt: endsAt } }, select: { scheduledAt: true, durationMinutes: true } }),
          tx.appointmentRequest.findMany({ where: { doctorId, status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] }, requestedAt: { lt: endsAt } }, select: { requestedAt: true, durationMinutes: true } }),
        ]);
        if (appointments.some((item) => slotsOverlap(startsAt, duration, item.scheduledAt, item.durationMinutes)) || requests.some((item) => slotsOverlap(startsAt, duration, item.requestedAt, item.durationMinutes))) throw new Error("SLOT_TAKEN");
      }
      if (email !== patient.email) await tx.patient.update({ where: { id: patient.id }, data: { email: email || null, version: { increment: 1 }, updatedById: (session.user as any).id } });
      const created = await tx.appointment.create({ data: { patientId, doctorId: doctorId || null, organizationId, clinicId: doctor?.practitionerProfile?.clinicId || null, appointmentTypeId: appointmentType?.id || null, scheduledAt: startsAt, durationMinutes: duration, reason: reason?.trim() || null } });
      await tx.appointmentStatusHistory.create({ data: { appointmentId: created.id, newStatus: "SCHEDULED", changedById: (session.user as any).id } });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if ((error instanceof Error && error.message === "SLOT_TAKEN") || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")) return NextResponse.json({ error: "That time was just booked. Choose another slot." }, { status: 409 });
    throw error;
  }
  await audit({ organizationId, userId: (session.user as any).id, patientId, action: "APPOINTMENT_CREATED", resourceType: "Appointment", resourceId: appointment.id, request: req });
  const notifications = await sendAppointmentNotifications({ patientName: patient.name, patientEmail: email, organizationName: (session.user as any).organizationName || "CareChart", doctorName: doctor?.name, scheduledAt: startsAt, durationMinutes: duration, reason: reason?.trim() || null });
  return NextResponse.json({ ...appointment, notifications }, { status: 201 });
}

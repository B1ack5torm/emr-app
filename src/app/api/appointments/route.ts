import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendAppointmentNotifications } from "@/lib/appointment-notifications";

const staffRoles = ["RECEPTION", "ADMIN", "SUPER_ADMIN"];

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const organizationId = (session.user as any).organizationId;
  const isSuperAdmin = (session.user as any).role === "SUPER_ADMIN";
  const date = req.nextUrl.searchParams.get("date");
  const start = date ? new Date(`${date}T00:00:00`) : new Date();
  if (Number.isNaN(start.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  const end = new Date(start); end.setDate(end.getDate() + 1);

  const [appointments, onlineAppointments, doctors] = await Promise.all([
    prisma.appointment.findMany({
      where: { ...(isSuperAdmin ? {} : { organizationId }), scheduledAt: { gte: start, lt: end } },
      include: { patient: { select: { id: true, name: true, mrn: true, phone: true, email: true } }, doctor: { select: { id: true, name: true } } },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.appointmentRequest.findMany({
      where: { ...(isSuperAdmin ? {} : { organizationId }), status: { in: ["CONFIRMED", "CHECKED_IN"] }, requestedAt: { gte: start, lt: end } },
      include: { doctor: { select: { id: true, name: true } } },
      orderBy: { requestedAt: "asc" },
    }),
    prisma.user.findMany({ where: { ...(isSuperAdmin ? {} : { organizationId }), role: "DOCTOR", status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const schedule = [
    ...appointments.map((appointment) => ({ ...appointment, source: "INTERNAL" as const })),
    ...onlineAppointments.map((appointment) => ({
      id: appointment.id,
      scheduledAt: appointment.requestedAt,
      durationMinutes: appointment.durationMinutes,
      reason: appointment.reason,
      status: appointment.status,
      source: "ONLINE" as const,
      patient: { id: "", name: appointment.patientName, mrn: "Online request", phone: appointment.patientPhone, email: appointment.patientEmail },
      doctor: appointment.doctor,
    })),
  ].sort((left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime());
  return NextResponse.json({ appointments: schedule, doctors });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!staffRoles.includes((session.user as any).role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const organizationId = (session.user as any).organizationId;
  const { patientId, doctorId, scheduledAt, durationMinutes, reason, contactEmail } = await req.json();
  const startsAt = new Date(scheduledAt);
  const duration = Number(durationMinutes);
  if (!patientId || !scheduledAt || Number.isNaN(startsAt.getTime()) || !Number.isInteger(duration) || duration < 5 || duration > 240) {
    return NextResponse.json({ error: "Patient, valid date/time, and a duration between 5 and 240 minutes are required." }, { status: 400 });
  }
  const patient = await prisma.patient.findFirst({ where: { id: patientId, organizationId } });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  let doctor: { name: string } | null = null;
  if (doctorId) {
    doctor = await prisma.user.findFirst({ where: { id: doctorId, organizationId, role: "DOCTOR", status: "ACTIVE" }, select: { name: true } });
    if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }
  const endsAt = new Date(startsAt.getTime() + duration * 60_000);
  if (doctorId) {
    const existing = await prisma.appointment.findMany({ where: { doctorId, status: "SCHEDULED", scheduledAt: { lt: endsAt } }, select: { scheduledAt: true, durationMinutes: true } });
    const conflict = existing.some((a) => new Date(a.scheduledAt).getTime() + a.durationMinutes * 60_000 > startsAt.getTime());
    if (conflict) return NextResponse.json({ error: "This doctor already has an appointment in that time slot." }, { status: 409 });
  }
  const email = contactEmail?.trim() || patient.email;
  if (email !== patient.email) await prisma.patient.update({ where: { id: patient.id }, data: { email: email || null } });
  const appointment = await prisma.appointment.create({ data: { patientId, doctorId: doctorId || null, organizationId, scheduledAt: startsAt, durationMinutes: duration, reason: reason?.trim() || null } });
  const notifications = await sendAppointmentNotifications({ patientName: patient.name, patientEmail: email, organizationName: (session.user as any).organizationName || "CareChart", doctorName: doctor?.name, scheduledAt: startsAt, durationMinutes: duration, reason: reason?.trim() || null });
  return NextResponse.json({ ...appointment, notifications }, { status: 201 });
}

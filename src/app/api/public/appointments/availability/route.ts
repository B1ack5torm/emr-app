import { NextRequest, NextResponse } from "next/server";
import { normalizeHospitalSlug } from "@/lib/domain/public-booking";
import { generateAvailableSlots } from "@/lib/domain/scheduling";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const doctorId = req.nextUrl.searchParams.get("doctorId") || "";
  const appointmentTypeId = req.nextUrl.searchParams.get("appointmentTypeId") || "";
  const hospitalSlug = normalizeHospitalSlug(req.nextUrl.searchParams.get("hospital"));
  const date = req.nextUrl.searchParams.get("date") || "";
  const dayStart = new Date(`${date}T00:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const latest = new Date(today); latest.setDate(latest.getDate() + 30);
  if (!hospitalSlug || !doctorId || Number.isNaN(dayStart.getTime()) || dayStart < today || dayStart > latest) return NextResponse.json({ error: "Choose a valid hospital, doctor, and date within the next 30 days." }, { status: 400 });
  const organization = await prisma.organization.findFirst({ where: { slug: hospitalSlug, onlineBookingEnabled: true }, select: { id: true } });
  if (!organization) return NextResponse.json({ error: "Online booking is not available for this hospital." }, { status: 404 });
  const doctor = await prisma.user.findFirst({
    where: { id: doctorId, organizationId: organization.id, role: "DOCTOR", status: "ACTIVE", practitionerProfile: { is: { active: true, acceptsOnlineAppointments: true } } },
    select: { id: true, practitionerProfile: { include: { schedules: { where: { dayOfWeek: dayStart.getDay(), active: true }, include: { breaks: true } }, clinic: true } } },
  });
  if (!doctor?.practitionerProfile) return NextResponse.json({ error: "Doctor not found." }, { status: 404 });
  const appointmentType = appointmentTypeId ? await prisma.appointmentType.findFirst({ where: { id: appointmentTypeId, organizationId: organization.id, clinicId: doctor.practitionerProfile.clinicId, active: true } }) : null;
  if (appointmentTypeId && !appointmentType) return NextResponse.json({ error: "Appointment type not found." }, { status: 404 });
  if (doctor.practitionerProfile.schedules.length === 0) return NextResponse.json({ slots: [] });

  const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
  const [appointments, requests, blocked, holiday] = await Promise.all([
    prisma.appointment.findMany({ where: { organizationId: organization.id, doctorId, status: { not: "CANCELLED" }, scheduledAt: { gte: dayStart, lt: dayEnd } }, select: { scheduledAt: true, durationMinutes: true } }),
    prisma.appointmentRequest.findMany({ where: { organizationId: organization.id, doctorId, status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] }, requestedAt: { gte: dayStart, lt: dayEnd } }, select: { requestedAt: true, durationMinutes: true } }),
    prisma.blockedPeriod.findMany({ where: { practitionerId: doctor.practitionerProfile.id, startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } }, select: { startsAt: true, endsAt: true } }),
    prisma.holiday.findFirst({ where: { clinicId: doctor.practitionerProfile.clinicId, date: { gte: dayStart, lt: dayEnd } }, select: { id: true } }),
  ]);
  if (holiday) return NextResponse.json({ slots: [] });
  const reservations = [...appointments.map((item) => ({ startsAt: item.scheduledAt, durationMinutes: item.durationMinutes })), ...requests.map((item) => ({ startsAt: item.requestedAt, durationMinutes: item.durationMinutes }))];
  const periods = doctor.practitionerProfile.schedules.map((schedule) => ({ startMinute: schedule.startMinute, endMinute: schedule.endMinute, appointmentMinutes: appointmentType?.durationMinutes || schedule.appointmentMinutes, slotIntervalMinutes: schedule.appointmentMinutes, breaks: schedule.breaks }));
  return NextResponse.json({ slots: generateAvailableSlots(date, periods, reservations, blocked) });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAvailableSlots } from "@/lib/domain/scheduling";

const OPEN_HOUR = 9;
const CLOSE_HOUR = 17;
const SLOT_MINUTES = 30;

export async function GET(req: NextRequest) {
  const doctorId = req.nextUrl.searchParams.get("doctorId") || "";
  const appointmentTypeId = req.nextUrl.searchParams.get("appointmentTypeId") || "";
  const date = req.nextUrl.searchParams.get("date") || "";
  const dayStart = new Date(`${date}T00:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const latest = new Date(today); latest.setDate(latest.getDate() + 30);
  if (!doctorId || Number.isNaN(dayStart.getTime()) || dayStart < today || dayStart > latest) return NextResponse.json({ error: "Choose a valid date within the next 30 days." }, { status: 400 });
  const doctor = await prisma.user.findFirst({ where: { id: doctorId, role: "DOCTOR", status: "ACTIVE" }, select: { id: true, practitionerProfile: { include: { schedules: { where: { dayOfWeek: dayStart.getDay(), active: true }, include: { breaks: true } }, clinic: true } } } });
  if (!doctor) return NextResponse.json({ error: "Doctor not found." }, { status: 404 });
  const appointmentType = appointmentTypeId && doctor.practitionerProfile ? await prisma.appointmentType.findFirst({ where: { id: appointmentTypeId, clinicId: doctor.practitionerProfile.clinicId, active: true } }) : null;
  if (appointmentTypeId && !appointmentType) return NextResponse.json({ error: "Appointment type not found." }, { status: 404 });

  const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
  const [appointments, requests, blocked, holiday] = await Promise.all([
    prisma.appointment.findMany({ where: { doctorId, status: { not: "CANCELLED" }, scheduledAt: { gte: dayStart, lt: dayEnd } }, select: { scheduledAt: true, durationMinutes: true } }),
    prisma.appointmentRequest.findMany({ where: { doctorId, status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] }, requestedAt: { gte: dayStart, lt: dayEnd } }, select: { requestedAt: true, durationMinutes: true } }),
    doctor.practitionerProfile ? prisma.blockedPeriod.findMany({ where: { practitionerId: doctor.practitionerProfile.id, startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } }, select: { startsAt: true, endsAt: true } }) : [],
    doctor.practitionerProfile ? prisma.holiday.findFirst({ where: { clinicId: doctor.practitionerProfile.clinicId, date: { gte: dayStart, lt: dayEnd } }, select: { id: true } }) : null,
  ]);
  if (holiday) return NextResponse.json({ slots: [] });
  const reservations = [...appointments.map((item) => ({ startsAt: item.scheduledAt, durationMinutes: item.durationMinutes })), ...requests.map((item) => ({ startsAt: item.requestedAt, durationMinutes: item.durationMinutes }))];
  if (doctor.practitionerProfile?.schedules.length) {
    const periods = doctor.practitionerProfile.schedules.map((schedule) => ({ startMinute: schedule.startMinute, endMinute: schedule.endMinute, appointmentMinutes: appointmentType?.durationMinutes || schedule.appointmentMinutes, slotIntervalMinutes: schedule.appointmentMinutes, breaks: schedule.breaks }));
    return NextResponse.json({ slots: generateAvailableSlots(date, periods, reservations, blocked) });
  }
  if (dayStart.getDay() === 0) return NextResponse.json({ slots: [] });
  const slots: string[] = [];
  for (let minutes = OPEN_HOUR * 60; minutes < CLOSE_HOUR * 60; minutes += SLOT_MINUTES) {
    const startsAt = new Date(`${date}T00:00:00`); startsAt.setMinutes(minutes);
    const endsAt = new Date(startsAt.getTime() + SLOT_MINUTES * 60_000);
    if (startsAt.getTime() <= Date.now()) continue;
    const conflict = reservations.some((reservation) => {
      const existingStart = new Date(reservation.startsAt).getTime();
      const existingEnd = existingStart + reservation.durationMinutes * 60_000;
      return existingStart < endsAt.getTime() && existingEnd > startsAt.getTime();
    });
    if (!conflict) slots.push(`${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`);
  }
  return NextResponse.json({ slots });
}

import { slotsOverlap } from "@/lib/domain/appointments";

export type WorkingPeriod = { startMinute: number; endMinute: number; appointmentMinutes: number; slotIntervalMinutes?: number; breaks?: { startMinute: number; endMinute: number }[] };
export type Reservation = { startsAt: Date; durationMinutes: number };

export function generateAvailableSlots(date: string, periods: WorkingPeriod[], reservations: Reservation[], blocked: { startsAt: Date; endsAt: Date }[], now = new Date()) {
  const slots: string[] = [];
  for (const period of periods) {
    const interval = period.slotIntervalMinutes || period.appointmentMinutes;
    if (period.startMinute < 0 || period.endMinute > 1440 || period.startMinute >= period.endMinute || period.appointmentMinutes < 5 || interval < 5) continue;
    for (let minute = period.startMinute; minute + period.appointmentMinutes <= period.endMinute; minute += interval) {
      const startsAt = new Date(`${date}T00:00:00`); startsAt.setMinutes(minute);
      const endsAt = new Date(startsAt.getTime() + period.appointmentMinutes * 60_000);
      if (startsAt <= now) continue;
      if (period.breaks?.some((item) => minute < item.endMinute && minute + period.appointmentMinutes > item.startMinute)) continue;
      if (blocked.some((item) => startsAt < item.endsAt && endsAt > item.startsAt)) continue;
      if (reservations.some((item) => slotsOverlap(startsAt, period.appointmentMinutes, item.startsAt, item.durationMinutes))) continue;
      slots.push(`${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`);
    }
  }
  return [...new Set(slots)].sort();
}

export function isTimeWithinWorkingPeriods(startsAt: Date, durationMinutes: number, periods: WorkingPeriod[], blocked: { startsAt: Date; endsAt: Date }[]) {
  if (Number.isNaN(startsAt.getTime()) || !Number.isInteger(durationMinutes) || durationMinutes < 5) return false;
  const startMinute = startsAt.getHours() * 60 + startsAt.getMinutes(), endMinute = startMinute + durationMinutes;
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
  if (blocked.some((item) => startsAt < item.endsAt && endsAt > item.startsAt)) return false;
  return periods.some((period) => {
    const interval = period.slotIntervalMinutes || period.appointmentMinutes;
    return startMinute >= period.startMinute && endMinute <= period.endMinute && (startMinute - period.startMinute) % interval === 0 &&
      !period.breaks?.some((item) => startMinute < item.endMinute && endMinute > item.startMinute);
  });
}

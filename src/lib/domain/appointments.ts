export type AppointmentState = "REQUESTED" | "CONFIRMED" | "SCHEDULED" | "CHECKED_IN" | "IN_CONSULTATION" | "COMPLETED" | "CANCELLED" | "RESCHEDULED" | "NO_SHOW";

const transitions: Record<AppointmentState, AppointmentState[]> = {
  REQUESTED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED", "RESCHEDULED", "NO_SHOW"],
  SCHEDULED: ["CHECKED_IN", "CANCELLED", "RESCHEDULED", "NO_SHOW"],
  CHECKED_IN: ["IN_CONSULTATION", "CANCELLED"],
  IN_CONSULTATION: ["COMPLETED"],
  COMPLETED: [], CANCELLED: [], RESCHEDULED: [], NO_SHOW: [],
};

export function canTransitionAppointment(from: AppointmentState, to: AppointmentState) {
  return transitions[from]?.includes(to) || false;
}

export function slotsOverlap(startA: Date, durationA: number, startB: Date, durationB: number) {
  const endA = startA.getTime() + durationA * 60_000;
  const endB = startB.getTime() + durationB * 60_000;
  return startA.getTime() < endB && startB.getTime() < endA;
}

export function validateAppointmentTime(startsAt: Date, durationMinutes: number, now = new Date()) {
  if (Number.isNaN(startsAt.getTime())) return "Enter a valid appointment time.";
  if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 240) return "Duration must be between 5 and 240 minutes.";
  if (startsAt.getTime() <= now.getTime()) return "Appointments cannot be booked in the past.";
  return null;
}

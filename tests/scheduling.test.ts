import assert from "node:assert/strict";
import test from "node:test";
import { generateAvailableSlots, isTimeWithinWorkingPeriods } from "../src/lib/domain/scheduling";

test("availability excludes breaks, blocked periods, and reservations", () => {
  const date = "2026-08-20", now = new Date("2026-08-19T00:00:00");
  const slots = generateAvailableSlots(date, [{ startMinute: 540, endMinute: 720, appointmentMinutes: 30, breaks: [{ startMinute: 600, endMinute: 630 }] }], [{ startsAt: new Date(`${date}T09:30:00`), durationMinutes: 30 }], [{ startsAt: new Date(`${date}T11:00:00`), endsAt: new Date(`${date}T11:30:00`) }], now);
  assert.deepEqual(slots, ["09:00", "10:30", "11:30"]);
});

test("working-period validation respects slot cadence, duration, breaks, and blocks", () => {
  const periods = [{ startMinute: 540, endMinute: 1020, appointmentMinutes: 60, slotIntervalMinutes: 30, breaks: [{ startMinute: 780, endMinute: 840 }] }];
  assert.equal(isTimeWithinWorkingPeriods(new Date("2030-01-07T09:30:00"), 60, periods, []), true);
  assert.equal(isTimeWithinWorkingPeriods(new Date("2030-01-07T13:30:00"), 60, periods, []), false);
  assert.equal(isTimeWithinWorkingPeriods(new Date("2030-01-07T09:15:00"), 60, periods, []), false);
  assert.equal(isTimeWithinWorkingPeriods(new Date("2030-01-07T10:00:00"), 60, periods, [{ startsAt: new Date("2030-01-07T10:15:00"), endsAt: new Date("2030-01-07T10:45:00") }]), false);
});

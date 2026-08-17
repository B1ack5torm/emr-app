import assert from "node:assert/strict";
import test from "node:test";
import { canTransitionAppointment, slotsOverlap, validateAppointmentTime } from "../src/lib/domain/appointments";

test("appointments detect overlap but permit adjacent slots", () => {
  const atNine = new Date("2026-08-18T09:00:00.000Z");
  assert.equal(slotsOverlap(atNine, 30, new Date("2026-08-18T09:15:00.000Z"), 30), true);
  assert.equal(slotsOverlap(atNine, 30, new Date("2026-08-18T09:30:00.000Z"), 30), false);
});

test("appointment transitions reject terminal and skipped states", () => {
  assert.equal(canTransitionAppointment("SCHEDULED", "CHECKED_IN"), true);
  assert.equal(canTransitionAppointment("CHECKED_IN", "COMPLETED"), false);
  assert.equal(canTransitionAppointment("COMPLETED", "CANCELLED"), false);
});

test("appointments cannot be created in the past", () => {
  const now = new Date("2026-08-18T10:00:00.000Z");
  assert.match(validateAppointmentTime(new Date("2026-08-18T09:00:00.000Z"), 30, now) || "", /past/);
  assert.equal(validateAppointmentTime(new Date("2026-08-18T11:00:00.000Z"), 30, now), null);
});

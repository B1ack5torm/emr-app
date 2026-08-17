import assert from "node:assert/strict";
import test from "node:test";
import { calculateBmi, medicationMatchesAllergy, validateVitalRange } from "../src/lib/domain/clinical";

test("BMI is calculated from measured height and weight", () => {
  assert.equal(calculateBmi(170, 65), 22.5);
  assert.equal(calculateBmi(0, 65), null);
});

test("medication-allergy comparison is case insensitive", () => {
  assert.equal(medicationMatchesAllergy("Penicillin V", ["PENICILLIN"]), true);
  assert.equal(medicationMatchesAllergy("Paracetamol", ["Penicillin"]), false);
});

test("vital validation rejects impossible values", () => {
  assert.match(validateVitalRange({ oxygenSaturation: 120 }) || "", /Oxygen/);
  assert.equal(validateVitalRange({ systolicBp: 120, diastolicBp: 80, oxygenSaturation: 98 }), null);
});

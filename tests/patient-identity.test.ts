import assert from "node:assert/strict";
import test from "node:test";
import { normalizePatientPhone, rankPotentialDuplicates, scorePotentialDuplicate } from "../src/lib/domain/patient-identity";

test("patient identity normalizes Indian phone prefixes", () => {
  assert.equal(normalizePatientPhone("+91 98765-43210"), "9876543210");
});

test("duplicate scoring prioritizes strong demographic matches", () => {
  const match = scorePotentialDuplicate(
    { name: "Meera Kapoor", dateOfBirth: "1990-04-20", phone: "+91 9876543210" },
    { name: "Meera Kapoor", dateOfBirth: "1990-04-20", phone: "98765 43210" },
  );
  assert.equal(match.score, 100);
  assert.deepEqual(match.reasons, ["same name", "same date of birth", "same phone"]);
});

test("duplicate ranking excludes weak name-only matches", () => {
  const matches = rankPotentialDuplicates(
    { name: "Rohan Das", dateOfBirth: "1988-01-02" },
    [{ id: "1", name: "Rohan Das" }, { id: "2", name: "Rohan Das", dateOfBirth: "1988-01-02" }],
  );
  assert.deepEqual(matches.map((match) => match.id), ["2"]);
});

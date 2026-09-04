import assert from "node:assert/strict";
import test from "node:test";
import { normalizeHospitalSlug } from "../src/lib/domain/public-booking";

test("hospital booking slugs are normalized and restricted", () => {
  assert.equal(normalizeHospitalSlug(" Nexus-Care-Hospital "), "nexus-care-hospital");
  assert.equal(normalizeHospitalSlug("nexus care hospital"), null);
  assert.equal(normalizeHospitalSlug("../other-hospital"), null);
  assert.equal(normalizeHospitalSlug(undefined), null);
});

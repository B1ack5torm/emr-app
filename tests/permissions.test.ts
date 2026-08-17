import assert from "node:assert/strict";
import test from "node:test";
import { roleHasPermission } from "../src/lib/security";

test("clinical and billing roles receive only their intended capabilities", () => {
  assert.equal(roleHasPermission("DOCTOR", "encounter:finalize"), true);
  assert.equal(roleHasPermission("DOCTOR", "payment:record"), false);
  assert.equal(roleHasPermission("BILLING", "payment:record"), true);
  assert.equal(roleHasPermission("LAB_RADIOLOGY", "document:upload"), true);
  assert.equal(roleHasPermission("LAB_RADIOLOGY", "result:review"), false);
  assert.equal(roleHasPermission("PATIENT", "audit:read"), false);
});

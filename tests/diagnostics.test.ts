import assert from "node:assert/strict";
import test from "node:test";
import { canCreateOperationalDiagnosticOrder, canReviewDiagnosticOrder, canTransitionDiagnosticOrder } from "../src/lib/domain/diagnostics";

test("diagnostic results require completion before review", () => {
  assert.equal(canTransitionDiagnosticOrder("CREATED", "REVIEWED"), false);
  assert.equal(canTransitionDiagnosticOrder("IN_PROGRESS", "COMPLETED"), true);
  assert.equal(canTransitionDiagnosticOrder("COMPLETED", "REVIEWED"), true);
  assert.equal(canTransitionDiagnosticOrder("REVIEWED", "CANCELLED"), false);
});

test("operational diagnostic orders require the hospital feature and an active encounter", () => {
  assert.deepEqual(canCreateOperationalDiagnosticOrder(false, null), { allowed: false, code: "DIAGNOSTIC_ORDERS_DISABLED" });
  assert.deepEqual(canCreateOperationalDiagnosticOrder(true, new Date()), { allowed: false, code: "ENCOUNTER_FINALIZED" });
  assert.deepEqual(canCreateOperationalDiagnosticOrder(true, null), { allowed: true, code: null });
});

test("only the ordering doctor or an administrator can acknowledge a diagnostic report", () => {
  assert.equal(canReviewDiagnosticOrder("DOCTOR", "doctor-1", "doctor-1"), true);
  assert.equal(canReviewDiagnosticOrder("DOCTOR", "doctor-2", "doctor-1"), false);
  assert.equal(canReviewDiagnosticOrder("LAB_RADIOLOGY", "lab-1", "doctor-1"), false);
  assert.equal(canReviewDiagnosticOrder("ADMIN", "admin-1", "doctor-1"), true);
});

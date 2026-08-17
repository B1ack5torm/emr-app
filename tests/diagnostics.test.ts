import assert from "node:assert/strict";
import test from "node:test";
import { canTransitionDiagnosticOrder } from "../src/lib/domain/diagnostics";

test("diagnostic results require completion before review", () => {
  assert.equal(canTransitionDiagnosticOrder("CREATED", "REVIEWED"), false);
  assert.equal(canTransitionDiagnosticOrder("IN_PROGRESS", "COMPLETED"), true);
  assert.equal(canTransitionDiagnosticOrder("COMPLETED", "REVIEWED"), true);
  assert.equal(canTransitionDiagnosticOrder("REVIEWED", "CANCELLED"), false);
});

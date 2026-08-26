import assert from "node:assert/strict";
import test from "node:test";
import { defaultPortalPath, portalAreaForPath, roleCanAccessArea } from "../src/lib/portal-access";

test("doctor navigation exposes clinical work but not hospital administration", () => {
  assert.equal(roleCanAccessArea("DOCTOR", "doctor"), true);
  assert.equal(roleCanAccessArea("DOCTOR", "records"), true);
  assert.equal(roleCanAccessArea("DOCTOR", "diagnostics"), true);
  assert.equal(roleCanAccessArea("DOCTOR", "admin"), false);
  assert.equal(roleCanAccessArea("DOCTOR", "billing"), false);
});

test("route guards and landing redirects use the same portal areas", () => {
  assert.equal(portalAreaForPath("/settings/schedules"), "settings");
  assert.equal(portalAreaForPath("/book-appointment"), null);
  assert.equal(defaultPortalPath("DOCTOR"), "/doctor");
  assert.equal(defaultPortalPath("CLINIC_ADMIN"), "/admin");
  assert.equal(defaultPortalPath("LAB_RADIOLOGY"), "/diagnostics");
  assert.equal(defaultPortalPath("NURSE"), "/frontdesk");
  assert.equal(roleCanAccessArea("NURSE", "frontdesk"), true);
});

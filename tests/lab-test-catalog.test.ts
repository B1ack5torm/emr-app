import assert from "node:assert/strict";
import test from "node:test";
import { labTestCatalog, searchLabTests } from "../src/lib/lab-test-catalog";

test("laboratory catalog is broad and has unique names and codes", () => {
  assert.ok(labTestCatalog.length >= 400);
  assert.equal(new Set(labTestCatalog.map((item) => item.name.toLocaleLowerCase())).size, labTestCatalog.length);
  assert.equal(new Set(labTestCatalog.map((item) => item.code)).size, labTestCatalog.length);
});

test("laboratory catalog search supports abbreviations and categories", () => {
  assert.equal(searchLabTests("CBC")[0]?.name, "Complete Blood Count (CBC)");
  assert.ok(searchLabTests("SGPT").some((item) => item.name === "ALT (SGPT)"));
  assert.ok(searchLabTests("thyroid").some((item) => item.name.includes("Thyroid Profile")));
  assert.ok(searchLabTests("urine culture").some((item) => item.name === "Urine Culture and Sensitivity"));
});

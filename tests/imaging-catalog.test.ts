import assert from "node:assert/strict";
import test from "node:test";
import { imagingCatalog, searchImagingCatalog } from "../src/lib/imaging-catalog";

test("imaging catalog covers major modalities with unique descriptions", () => {
  assert.ok(imagingCatalog.length >= 250);
  assert.ok(new Set(imagingCatalog.map((item) => item.modality)).size >= 12);
  assert.equal(new Set(imagingCatalog.map((item) => item.name.toLocaleLowerCase())).size, imagingCatalog.length);
  assert.equal(new Set(imagingCatalog.map((item) => item.code)).size, imagingCatalog.length);
  assert.ok(imagingCatalog.every((item) => item.description && item.bodyPart));
});

test("imaging search finds the requested chest two-view X-ray and common aliases", () => {
  const chest = searchImagingCatalog("chest 2 views")[0];
  assert.equal(chest?.name, "Chest X-ray, 2 views");
  assert.equal(chest?.modality, "X-Ray");
  assert.equal(chest?.bodyPart, "Chest");
  assert.equal(searchImagingCatalog("NCCT brain")[0]?.name, "CT brain without contrast");
  assert.equal(searchImagingCatalog("TIFFA")[0]?.name, "Ultrasound obstetric - anomaly scan");
});

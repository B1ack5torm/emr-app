import assert from "node:assert/strict";
import test from "node:test";
import { matchesWorklistQuery, toDicomWorklistItem, type WorklistOrder } from "../src/lib/dicom-worklist";
import { newAccessionNumber } from "../src/lib/domain/imaging-orders";

const source: WorklistOrder = {
  id: "order-1",
  accessionNumber: "CC20260901A1B2C3",
  modality: "XRAY",
  procedureCode: "XR-CHEST-2V",
  procedureDescription: "Chest X-ray, 2 views",
  bodyPart: "Chest",
  clinicalIndication: "Cough",
  createdAt: new Date("2026-09-01T03:30:00.000Z"),
  visit: {
    id: "visit-1",
    weight: "62.5 kg",
    doctor: { id: "doctor-1", name: "Asha Rao" },
    appointment: { scheduledAt: new Date("2026-09-01T04:45:00.000Z"), clinic: { name: "Main" } },
    patient: {
      mrn: "MRN-1001",
      name: "Ananya Sharma",
      dateOfBirth: new Date("1988-04-12T00:00:00.000Z"),
      gender: "FEMALE",
      organization: { name: "Demo Hospital" },
    },
  },
};

const item = toDicomWorklistItem(source, { stationAeTitle: "CARECHART_MODALITY", stationName: "CareChart Imaging", timeZone: "Asia/Kolkata" });

test("worklist mapping creates the patient, procedure, and scheduled step fields", () => {
  assert.equal(item.PatientName, "Sharma^Ananya");
  assert.equal(item.PatientID, "MRN-1001");
  assert.equal(item.PatientBirthDate, "19880412");
  assert.equal(item.AccessionNumber, source.accessionNumber);
  assert.match(String(item.StudyInstanceUID), /^2\.25\.\d+$/);
  const step = (item.ScheduledProcedureStepSequence as Array<Record<string, unknown>>)[0];
  assert.equal(step.Modality, "CR");
  assert.equal(step.ScheduledStationAETitle, "CARECHART_MODALITY");
  assert.equal(step.ScheduledProcedureStepStartDate, "20260901");
  assert.equal(step.ScheduledProcedureStepStartTime, "101500");
  assert.equal(step.ScheduledProcedureStepStatus, "SCHEDULED");
});

test("worklist matching supports common C-FIND wildcard, station, modality, and date filters", () => {
  assert.equal(matchesWorklistQuery(item, { PatientName: "SHARMA*" }), true);
  assert.equal(matchesWorklistQuery(item, { PatientID: "OTHER" }), false);
  assert.equal(matchesWorklistQuery(item, { ScheduledProcedureStepSequence: [{ Modality: "CR", ScheduledStationAETitle: "CARECHART_MODALITY", ScheduledProcedureStepStartDate: "20260901-20260902" }] }), true);
  assert.equal(matchesWorklistQuery(item, { ScheduledProcedureStepSequence: [{ Modality: "CT" }] }), false);
});

test("new accession numbers fit DICOM SH and remain unique", () => {
  const first = newAccessionNumber(new Date("2026-09-01T00:00:00.000Z"));
  const second = newAccessionNumber(new Date("2026-09-01T00:00:00.000Z"));
  assert.equal(first.length, 16);
  assert.match(first, /^CC20260901[A-F0-9]{6}$/);
  assert.notEqual(first, second);
});

import { createHash } from "node:crypto";
import { modalityCode } from "@/lib/hl7";

export type WorklistOrder = {
  id: string;
  accessionNumber: string;
  modality: string;
  procedureCode: string;
  procedureDescription: string;
  bodyPart: string | null;
  clinicalIndication: string;
  createdAt: Date;
  visit: {
    id: string;
    weight: string | null;
    doctor: { id: string; name: string } | null;
    appointment: { scheduledAt: Date; clinic: { name: string } | null } | null;
    patient: {
      mrn: string;
      name: string;
      dateOfBirth: Date | null;
      gender: string;
      organization: { name: string };
    };
  };
};

export type WorklistConfig = {
  stationAeTitle: string;
  stationName: string;
  timeZone: string;
};

export type DicomWorklistItem = Record<string, unknown>;

function localParts(date: Date, timeZone: string) {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return {
    date: `${values.year}${values.month}${values.day}`,
    time: `${values.hour}${values.minute}${values.second}`,
  };
}

function dicomDate(date: Date | null) {
  return date ? date.toISOString().slice(0, 10).replaceAll("-", "") : "";
}

function personName(name: string) {
  const parts = name.trim().split(/\s+/);
  const family = parts.pop() || name;
  return `${family}^${parts.join(" ")}`;
}

function patientSex(gender: string) {
  return gender === "MALE" ? "M" : gender === "FEMALE" ? "F" : "O";
}

function deterministicUid(value: string) {
  const bytes = createHash("sha256").update(value).digest().subarray(0, 16);
  return `2.25.${BigInt(`0x${bytes.toString("hex")}`).toString(10)}`;
}

function patientWeight(value: string | null) {
  const parsed = Number.parseFloat(value || "");
  return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : "";
}

export function toDicomWorklistItem(order: WorklistOrder, config: WorklistConfig): DicomWorklistItem {
  const patient = order.visit.patient;
  const providerName = order.visit.doctor ? personName(order.visit.doctor.name) : "";
  const scheduledAt = order.visit.appointment?.scheduledAt || order.createdAt;
  const scheduled = localParts(scheduledAt, config.timeZone);
  const procedureDescription = order.bodyPart
    ? `${order.procedureDescription} - ${order.bodyPart}`
    : order.procedureDescription;

  return {
    SpecificCharacterSet: "ISO_IR 192",
    PatientName: personName(patient.name),
    PatientID: patient.mrn,
    IssuerOfPatientID: patient.organization.name,
    PatientBirthDate: dicomDate(patient.dateOfBirth),
    PatientSex: patientSex(patient.gender),
    PatientWeight: patientWeight(order.visit.weight),
    AccessionNumber: order.accessionNumber,
    InstitutionName: patient.organization.name,
    ReferringPhysicianName: providerName,
    RequestingPhysician: providerName,
    StudyInstanceUID: deterministicUid(order.id),
    StudyDescription: procedureDescription,
    StudyID: order.accessionNumber,
    ReasonForTheRequestedProcedure: order.clinicalIndication,
    RequestedProcedureID: order.procedureCode,
    RequestedProcedureDescription: procedureDescription,
    RequestedProcedurePriority: "ROUTINE",
    RequestedProcedureCodeSequence: [{
      CodeValue: order.procedureCode,
      CodingSchemeDesignator: "99CARECHART",
      CodeMeaning: order.procedureDescription,
    }],
    ReferencedStudySequence: [],
    ScheduledProcedureStepSequence: [{
      ScheduledStationAETitle: config.stationAeTitle,
      ScheduledStationName: config.stationName,
      ScheduledProcedureStepStartDate: scheduled.date,
      ScheduledProcedureStepStartTime: scheduled.time,
      Modality: modalityCode(order.modality),
      ScheduledPerformingPhysicianName: providerName,
      ScheduledProcedureStepDescription: procedureDescription,
      ScheduledProtocolCodeSequence: [{
        CodeValue: order.procedureCode,
        CodingSchemeDesignator: "99CARECHART",
        CodeMeaning: order.procedureDescription,
      }],
      ScheduledProcedureStepID: order.accessionNumber,
      ScheduledProcedureStepStatus: "SCHEDULED",
    }],
  };
}

function wildcardPattern(value: string) {
  return new RegExp(`^${value.replace(/[.+^${}()|[\]\\]/g, "\\$&").replaceAll("*", ".*").replaceAll("?", ".")}$`, "i");
}

function matchesText(candidate: unknown, query: unknown) {
  const expected = String(query || "").trim();
  if (!expected) return true;
  return wildcardPattern(expected).test(String(candidate || ""));
}

function matchesDate(candidate: unknown, query: unknown) {
  const expected = String(query || "").trim();
  if (!expected) return true;
  const actual = String(candidate || "");
  if (!expected.includes("-")) return actual === expected;
  const [from, to] = expected.split("-", 2);
  return (!from || actual >= from) && (!to || actual <= to);
}

export function matchesWorklistQuery(item: DicomWorklistItem, query: Record<string, unknown>) {
  const requestedStep = Array.isArray(query.ScheduledProcedureStepSequence)
    ? (query.ScheduledProcedureStepSequence[0] as Record<string, unknown> | undefined) || {}
    : {};
  const step = (item.ScheduledProcedureStepSequence as Array<Record<string, unknown>>)[0];

  return matchesText(item.PatientName, query.PatientName)
    && matchesText(item.PatientID, query.PatientID)
    && matchesText(item.AccessionNumber, query.AccessionNumber)
    && matchesText(item.RequestedProcedureID, query.RequestedProcedureID)
    && matchesText(item.RequestedProcedureDescription, query.RequestedProcedureDescription)
    && matchesText(step.Modality, requestedStep.Modality || query.Modality)
    && matchesText(step.ScheduledStationAETitle, requestedStep.ScheduledStationAETitle || query.ScheduledStationAETitle)
    && matchesText(step.ScheduledStationName, requestedStep.ScheduledStationName || query.ScheduledStationName)
    && matchesDate(step.ScheduledProcedureStepStartDate, requestedStep.ScheduledProcedureStepStartDate || query.ScheduledProcedureStepStartDate);
}

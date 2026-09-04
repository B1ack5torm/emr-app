import { randomUUID } from "crypto";

export const ACTIVE_IMAGING_ORDER_ENCOUNTER_STATUSES = new Set(["DRAFT", "WAITING", "IN_PROGRESS"]);
export const IMAGING_MODALITIES = new Set(["XRAY", "CT", "MRI", "ULTRASOUND", "NUCLEAR", "OTHER"]);

export function isActiveImagingOrderEncounter(status: string) {
  return ACTIVE_IMAGING_ORDER_ENCOUNTER_STATUSES.has(status);
}

export function imagingOrderStatusForAck(code: string): "SENT" | "FAILED" {
  return code === "AA" ? "SENT" : "FAILED";
}

export function newAccessionNumber(now = new Date()) {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  // DICOM (0008,0050) Accession Number uses VR SH, whose maximum length is 16.
  return `CC${date}${randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`;
}

export function newMessageControlId() {
  return `CC-${randomUUID().replaceAll("-", "").toUpperCase()}`;
}

export function validateImagingOrderInput(value: unknown) {
  const body = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const modality = String(body.modality || "").toUpperCase();
  const procedureCode = String(body.procedureCode || "").trim().slice(0, 100);
  const procedureDescription = String(body.procedureDescription || "").trim().slice(0, 500);
  const bodyPart = String(body.bodyPart || "").trim().slice(0, 200) || null;
  const clinicalIndication = String(body.clinicalIndication || "").trim().slice(0, 2000);

  if (!IMAGING_MODALITIES.has(modality)) return { error: "Select a valid imaging modality." } as const;
  if (!procedureCode) return { error: "Procedure code is required." } as const;
  if (!procedureDescription) return { error: "Procedure description is required." } as const;
  if (!clinicalIndication) return { error: "Clinical indication is required." } as const;
  return { data: { modality, procedureCode, procedureDescription, bodyPart, clinicalIndication } } as const;
}

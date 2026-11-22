import { Buffer } from "node:buffer";

const eventLevels = {
  public_booking_transaction_failed: "error",
  staff_invite_email_failed: "error",
  imaging_endpoint_unconfigured: "error",
  imaging_transmission_rejected: "warn",
  imaging_transmission_failed: "error",
  grafana_connection_test: "info",
} as const;

const pushPath = "/loki/api/v1/push";

type OperationalEvent = keyof typeof eventLevels;
type DeliveryStatus = "sent" | "disabled" | "failed";

export async function logOperationalEvent(event: OperationalEvent): Promise<DeliveryStatus> {
  // Only predefined events leave the app. This function accepts no request data or error details.
  const level = eventLevels[event];
  const line = JSON.stringify({ event, level });
  console[level](line);
  return pushLog(line, Date.now());
}

// Only committed audit action and resource-type pairs listed here can leave CareChart.
const auditActions: Record<string, readonly string[]> = {
  User: ["LOGIN_SUCCEEDED", "LOGIN_FAILED", "LOGOUT", "PASSWORD_CHANGED", "PASSWORD_RESET_REQUESTED", "PASSWORD_RESET_COMPLETED", "ADMIN_PASSWORD_RESET", "USER_CREATED", "USER_APPROVED", "USER_REJECTED", "USER_ACTIVATED", "USER_SUSPENDED", "USER_ROLE_CHANGED"],
  Organization: ["ACTIVE_HOSPITAL_CHANGED", "HOSPITAL_ACCOUNT_CREATED", "ONLINE_BOOKING_SETTING_UPDATED", "DIAGNOSTIC_ORDER_SETTINGS_UPDATED"],
  Patient: ["PATIENT_CREATED", "PATIENT_VIEWED", "PATIENT_UPDATED", "PATIENT_RECORDS_MERGED", "CLINICAL_SUMMARY_VIEWED"],
  PatientIdentifier: ["PATIENT_IDENTIFIER_ADDED", "PATIENT_IDENTIFIER_RETIRED"],
  Visit: ["ENCOUNTER_CREATED", "ENCOUNTER_UPDATED", "ENCOUNTER_FINALIZED", "ENCOUNTER_AMENDED"],
  Appointment: ["APPOINTMENT_CREATED", "APPOINTMENT_CANCELLED", "APPOINTMENT_CHECKED_IN", "APPOINTMENT_IN_CONSULTATION", "APPOINTMENT_COMPLETED", "APPOINTMENT_NO_SHOW"],
  AppointmentRequest: ["APPOINTMENT_REQUEST_CONFIRMED", "APPOINTMENT_REQUEST_REJECTED", "APPOINTMENT_CHECKED_IN", "ONLINE_APPOINTMENT_CANCELLED", "ONLINE_APPOINTMENT_NO_SHOW"],
  DiagnosticOrder: ["DIAGNOSTIC_ORDER_CREATED", "DIAGNOSTIC_ORDER_UPDATED", "DIAGNOSTIC_RESULT_REVIEWED", "DIAGNOSTIC_REPORT_UPLOADED"],
  ImagingOrder: ["IMAGING_ORDER_PLACED", "IMAGING_ORDER_ACCEPTED", "IMAGING_ORDER_REJECTED", "IMAGING_ORDER_TRANSMISSION_FAILED"],
  StoredDocument: ["DOCUMENT_UPLOADED", "DOCUMENT_DOWNLOADED", "DOCUMENT_INTEGRITY_FAILED"],
  FHIRBundle: ["FHIR_PATIENT_EXPORT"],
  PrivacyRequest: ["PRIVACY_REQUEST_RECEIVED"],
  Consent: ["CONSENT_RECORDED", "CONSENT_WITHDRAWN"],
  Invoice: ["INVOICE_CREATED", "INVOICE_UPDATED", "INVOICE_VOIDED"],
  Payment: ["PAYMENT_RECORDED"],
  Refund: ["INVOICE_REFUNDED"],
  ClinicLocation: ["CLINIC_CREATED"],
  Department: ["DEPARTMENT_CREATED"],
  AppointmentType: ["APPOINTMENT_TYPE_CREATED"],
  Holiday: ["CLINIC_HOLIDAY_CREATED"],
  BlockedPeriod: ["PRACTITIONER_TIME_BLOCKED"],
  PractitionerProfile: ["PRACTITIONER_CONFIGURED"],
  PractitionerSchedule: ["SCHEDULE_CONFIGURED"],
  ServiceCatalogItem: ["SERVICE_CATALOG_CONFIGURED"],
  TaxConfiguration: ["TAX_CONFIGURED"],
  ALLERGY: ["ALLERGY_RECORDED", "ALLERGY_STATUS_CHANGED"],
  PROBLEM: ["PROBLEM_RECORDED", "PROBLEM_STATUS_CHANGED"],
  MEDICATION: ["MEDICATION_RECORDED", "MEDICATION_STATUS_CHANGED"],
  IMMUNIZATION: ["IMMUNIZATION_RECORDED"],
  PROCEDURE: ["PROCEDURE_RECORDED"],
  FLAG: ["FLAG_RECORDED", "FLAG_STATUS_CHANGED"],
};

export async function logAuditEvent({ action, resourceType, createdAt }: {
  action: string;
  resourceType: string;
  createdAt: Date;
}): Promise<DeliveryStatus | "skipped"> {
  if (!Object.hasOwn(auditActions, resourceType) || !auditActions[resourceType].includes(action)) return "skipped";
  const timestamp = createdAt.getTime();
  if (!Number.isFinite(timestamp)) return "skipped";
  return pushLog(JSON.stringify({ action, resource_type: resourceType }), timestamp, "audit");
}

async function pushLog(line: string, timestamp: number, logType?: "audit"): Promise<DeliveryStatus> {
  const url = process.env.GRAFANA_LOKI_URL?.trim();
  const user = process.env.GRAFANA_LOKI_USER?.trim();
  const token = process.env.GRAFANA_LOKI_TOKEN?.trim();
  if (!url && !user && !token) return "disabled";
  if (!url || !user || !token) {
    console.warn("Grafana log delivery requires GRAFANA_LOKI_URL, GRAFANA_LOKI_USER, and GRAFANA_LOKI_TOKEN.");
    return "failed";
  }

  let endpoint: URL;
  try {
    endpoint = new URL(url);
    const path = endpoint.pathname.replace(/\/+$/, "");
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || (path && path !== pushPath)) {
      throw new Error("Invalid Loki endpoint");
    }
    endpoint.pathname = pushPath;
  } catch {
    console.warn("GRAFANA_LOKI_URL must be an HTTPS Loki base URL or push endpoint.");
    return "failed";
  }

  try {
    const authorization = Buffer.from(`${user}:${token}`, "utf8").toString("base64");
    const environment = process.env.VERCEL_ENV || process.env.GRAFANA_LOG_ENVIRONMENT?.trim() || process.env.NODE_ENV || "development";
    const stream: Record<string, string> = { service_name: "carechart-emr", environment };
    if (logType) stream.log_type = logType;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Basic ${authorization}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        streams: [{
          stream,
          values: [[`${timestamp}000000`, line]],
        }],
      }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(1_000),
    });
    await response.body?.cancel();
    if (response.ok) return "sent";
    console.warn(`Grafana log delivery failed (HTTP ${response.status}).`);
  } catch {
    console.warn("Grafana log delivery could not reach Loki or timed out.");
  }
  return "failed";
}

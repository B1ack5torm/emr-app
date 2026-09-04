# API overview

All authenticated endpoints use the NextAuth HTTP-only session cookie. Tenant identifiers come from the active server session; staff clients do not choose an organization.

## Core resources

- `/api/settings/clinics`, `/api/settings/practitioners`, `/api/settings/schedules`: clinic hierarchy, practitioner profiles, working periods, breaks, blocks, and holidays.
- `/api/public/appointments?hospital={slug}` and `/availability?hospital={slug}`: public idempotent booking and schedule-aware availability. The hospital and practitioner must explicitly opt in, and the practitioner must have an active configured schedule. Appointment POST bodies use `hospitalSlug`; client-supplied organization IDs are not accepted.
- `/api/diagnostic-orders` and `/api/diagnostic-orders/{id}`: paginated laboratory/imaging orders, results, status transitions, and review acknowledgement.
- `/api/patients/duplicates`, `/api/patients/merge`, and `/api/patients/{id}/identifiers`: patient identity matching, administrator-controlled merge, and external/MRN identifier management.
- `/api/patients/{id}/clinical-summary`: longitudinal allergies, problems, medication statements, immunizations, procedures, safety flags, observations, and encounters.
- `/api/fhir/patients/{id}`: audited, tenant-scoped FHIR R4-style collection bundle export for an authorized patient record.
- `/api/settings/billing`, `/api/settings/taxes`: organization service catalog, clinic prices, and effective tax settings.
- `/api/invoices/{id}/payments`, `/refunds`: payment receipts and separately recorded refunds.
- `/api/documents` and `/api/documents/{id}`: allow-listed upload, metadata listing, and authorized download.
- `/api/audit`: organization-scoped, paginated audit history.

Errors use `{ "error": "safe message" }` with HTTP 400/401/403/404/409 as appropriate. List endpoints expose pagination where data volume is unbounded.

Structured diagnostic completion accepts an `observations` array. Each observation must contain exactly one typed value. Numeric reference and critical thresholds are interpreted on the server; result review stamps both the order and its observations.

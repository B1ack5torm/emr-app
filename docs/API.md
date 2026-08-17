# API overview

All authenticated endpoints use the NextAuth HTTP-only session cookie. Tenant identifiers come from the active server session; staff clients do not choose an organization.

## Core resources

- `/api/settings/clinics`, `/api/settings/practitioners`, `/api/settings/schedules`: clinic hierarchy, practitioner profiles, working periods, breaks, blocks, and holidays.
- `/api/public/appointments` and `/availability`: public idempotent booking and schedule-aware availability.
- `/api/diagnostic-orders` and `/api/diagnostic-orders/{id}`: paginated laboratory/imaging orders, results, status transitions, and review acknowledgement.
- `/api/settings/billing`, `/api/settings/taxes`: organization service catalog, clinic prices, and effective tax settings.
- `/api/invoices/{id}/payments`, `/refunds`: payment receipts and separately recorded refunds.
- `/api/documents` and `/api/documents/{id}`: allow-listed upload, metadata listing, and authorized download.
- `/api/audit`: organization-scoped, paginated audit history.

Errors use `{ "error": "safe message" }` with HTTP 400/401/403/404/409 as appropriate. List endpoints expose pagination where data volume is unbounded.

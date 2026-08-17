# CareChart architecture

CareChart is a modular Next.js App Router monolith. Route handlers in `src/app/api` are the server boundary, Prisma is the only database access layer, and PostgreSQL is the system of record. Staff authentication is NextAuth credentials with encrypted/signed HTTP-only session cookies; browser-provided organization IDs are never accepted for staff mutations.

Tenant hierarchy is Organization → ClinicLocation → Department/PractitionerProfile → schedule and workflow records. Every tenant-owned model includes `organizationId`; route handlers derive it from the authenticated session and query it explicitly. `SUPER_ADMIN` is the sole cross-organization exception.

Core modules are patient registration and charting, appointment booking, encounters, prescriptions and diagnostic orders, invoices/payments, patient portal, and administration. `src/lib/security.ts` is the authorization and audit seam; new routes should use `requirePermission()` and `audit()` rather than testing role strings directly. Permission checks re-read user status and role from PostgreSQL, so suspension takes effect without waiting for the session cookie to expire.

Public reservations use serializable PostgreSQL transactions and client idempotency keys. Clinical finalization is transactional; finalized encounters reject ordinary updates, while corrections create amendment records containing original and corrected values.

The current schema preserves legacy CUID primary keys. New work should retain server-side tenant scopes and use opaque identifiers; migrating all existing primary keys to UUIDs requires a separately planned, data-safe migration.

## Integration boundaries

`src/lib/hl7.ts` and `src/lib/mllp.ts` are local transport/adaptor seams for future HL7/MLLP work. Imaging uses a local order workflow only. No PACS, DICOM, ABDM, payment, or messaging production integration is enabled.

`src/lib/domain/diagnostics.ts` defines ADT/ORM/ORU, modality-worklist, and PACS adapter seams with a no-network local implementation. `src/lib/document-storage.ts` defines storage and malware-scanner interfaces; development uses private local filesystem storage, while production requires an object-storage and real scanning adapter.

## Security assumptions

- HTTPS, managed Postgres backups, strong `NEXTAUTH_SECRET`, and production email configuration are deployment responsibilities.
- Audit metadata is intentionally limited to operational identifiers and must never contain passwords, tokens, authorization headers, or clinical narrative.
- Erasure requests are review records only. Clinical and financial records are not automatically deleted.

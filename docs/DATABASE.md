# Database and migration guide

PostgreSQL is accessed exclusively through Prisma. The schema uses opaque CUID identifiers inherited from the existing application and organization IDs for tenant-owned data. Key constraints include organization-local patient MRNs and invoice numbers, one visit per appointment, and unique reset-token hashes. Indexes support organization/date/status audit, consent, privacy, appointment, and patient queries.

## Applying migrations

For local development:

```bash
npx prisma migrate dev
npx prisma generate
npm run prisma:seed
```

For a deployed environment:

```bash
npx prisma migrate deploy
npx prisma generate
```

Never use `migrate reset` against an environment containing clinical or financial data. Prisma migrations are forward-only operationally: remediate schema/data mistakes with a reviewed compensating migration. Before migration, take an encrypted, access-controlled database backup and verify restore procedures in a separate environment. Current additive migrations cover privacy/audit, authentication safeguards, appointment integrity, structured encounters, clinic scheduling, diagnostics, billing configuration, refunds, and document metadata.

## Data handling

Audit events are append-only application records. Privacy `ERASURE` requests are workflow records and do not delete clinical or financial data automatically. Store only UTC timestamps; format dates in the organization’s configured clinic timezone (new organizations default to Asia/Kolkata).

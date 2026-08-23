# CareChart EMR — Phase 1 outpatient foundation

Next.js (App Router) + PostgreSQL (via Prisma) + NextAuth modular monolith for outpatient clinic operations. It is a development foundation, not a legal, security, or regulatory certification.

## What's included

- **Front Desk** — search/register patients (with allergy list) and log a visit,
  which puts the patient into the doctor's queue.
- **Doctor's Desk** — waiting queue, full chart with allergy alert, consultation
  form (notes, diagnosis, prescriptions, tests ordered), and digital sign-off.
- **Patient Records** — searchable history of every patient and every past visit.
- Server-side permission checks, organization-scoped access, and append-only audit-event foundation.
- Consent and privacy-request APIs, patient optimistic-locking/version fields, and final encounter immutability.
- Durable login throttling, authentication audit events, account suspension, time-limited password resets, and eight-hour staff sessions.
- Idempotent public bookings with booking references, privacy acceptance, serializable reservations, and status history.
- Structured vitals/BMI, diagnoses, expanded prescriptions with allergy acknowledgement, and encounter amendments.
- Clinic locations, departments, practitioner schedules, breaks, holidays, blocked periods, specialties, and appointment types.
- Unified laboratory/imaging orders with controlled status transitions and review acknowledgement.
- Service catalog, clinic prices, tax configuration, payment receipt numbers, and separately recorded refunds.
- Protected PDF/JPEG/PNG document storage with random keys, tenant-checked downloads, size limits, checksums, AES-256-GCM encryption, and a fail-closed production malware-scanner adapter.
- A normalized Postgres schema via Prisma (`prisma/schema.prisma`).
- Master patient identity controls with normalized contact matching, additional identifiers, duplicate review, and an administrator-only audited merge workflow.
- A longitudinal clinical summary covering problems, active medications, enriched allergies, immunizations, procedures, safety flags, and reviewed diagnostic observations.
- Structured laboratory result entry with typed values, reference ranges, automatic abnormal/critical interpretation, and clinical acknowledgement.
- Prescribing checks for allergy matches, duplicate therapy, and a focused high-risk interaction list with documented overrides.
- Tenant-scoped FHIR R4-style patient bundle export and an expanded patient portal clinical summary.

## 1. Install dependencies

```bash
npm install
```

## 2. Set up a Postgres database

Easiest options if you don't already have Postgres running:
- [Neon](https://neon.tech) or [Supabase](https://supabase.com) — free hosted Postgres, gives you a connection string in ~1 minute.
- Or run Postgres locally with Docker: `docker run --name emr-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres`

Copy `.env.example` to `.env` and fill in `DATABASE_URL`:

```bash
cp .env.example .env
```

Generate `NEXTAUTH_SECRET` with:

```bash
openssl rand -base64 32
```

## 3. Create the database tables

```bash
npx prisma migrate dev --name init
```

## 4. Seed demo staff accounts

```bash
npm run prisma:seed
```

The seed is development-only and currently creates fictional staff with a known temporary password. Set a unique local seed password before any shared deployment; never use demo accounts or data in production.

## 5. Run it

```bash
npm run dev
```

Visit `http://localhost:3000`, sign in, and try the flow: register a patient at
Front Desk → see them appear in the Doctor's Desk queue → complete a consultation
→ find the full record under Patient Records.

## Deploying

- **App**: push this repo to GitHub and import it into [Vercel](https://vercel.com) or [Railway](https://railway.app). Set the same environment variables there.
- **Database**: use the hosted Postgres URL from Neon/Supabase/RDS as `DATABASE_URL` in production too.
- After deploying, run `npx prisma migrate deploy` (instead of `migrate dev`) against the production database, then run the seed script once.

## Operations

Apply committed migrations in a deployed environment with `npx prisma migrate deploy`; use `npx prisma migrate dev` only for local development. Prisma migration rollback is forward-only: create a compensating migration and restore from a tested database backup when necessary. Backups should be encrypted, access-controlled, regularly restored into an isolated environment, and retained according to the clinic’s approved policy.

`DATABASE_URL`, `NEXTAUTH_SECRET`, and notification settings are documented in `.env.example`. Keep `.env` out of source control. Default scheduling display is Asia/Kolkata, while database timestamps are stored in UTC.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build
```

Database integration tests use fictional, uniquely named records and clean them up afterward. Run them only against a development or test database.

## Before using this with real patients

This starter covers the core workflow but is not a compliance-ready product yet.
Before real use, add:
- HTTPS everywhere (handled automatically by Vercel/Railway) and strong, unique passwords for every account.
- Complete MFA, document malware scanning, operational audit review, and the clinical amendment interface.
- Data backup and retention policy.
- A review against India's Digital Personal Data Protection Act and ABDM (Ayushman Bharat Digital Mission) guidelines for health record handling, since this is intended for a hospital in India.

See [architecture](docs/ARCHITECTURE.md), [API overview](docs/API.md), [database and migration guide](docs/DATABASE.md), [permission matrix](docs/PERMISSIONS.md), and the [Phase 2 backlog](docs/PHASE_2_BACKLOG.md).

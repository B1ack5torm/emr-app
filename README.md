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

## 4. Create the first platform administrator

Set `BOOTSTRAP_SUPER_ADMIN_NAME`, `BOOTSTRAP_SUPER_ADMIN_EMAIL`, and a strong `BOOTSTRAP_SUPER_ADMIN_PASSWORD` in `.env`, then run:

```bash
npm run bootstrap:super-admin
```

This is a one-time, fail-closed command: it refuses to create a second super administrator and never prints the password. Sign in with that account, open **Admin**, and create the Nexus Care Hospital organization and its hospital administrator.

## 5. Optional: seed demo staff accounts

```bash
npm run prisma:seed
```

The seed is development-only and currently creates fictional staff with a known temporary password. Set a unique local seed password before any shared deployment; never use demo accounts or data in production.

## 6. Run it

```bash
npm run dev
```

Visit `http://localhost:3000`, sign in, and try the flow: register a patient at
Front Desk → see them appear in the Doctor's Desk queue → complete a consultation
→ find the full record under Patient Records.

### Connect a hospital website to appointment booking

After creating the hospital, sign in as its administrator and configure a clinic, doctor profile, appointment type, and weekly schedule under **Settings**. Opt the doctor into online appointments, then enable hospital-wide online booking. The settings page displays the tenant-specific link:

```text
https://your-emr-domain.example/book-appointment?hospital=nexus-care-hospital
```

Use that URL for the **Book appointment** button on the Nexus Care Hospital website. Public APIs derive the organization from the slug; the browser cannot submit an organization ID. Hospitals and doctors are hidden by default, and no appointment slots are invented when a schedule has not been configured.

## Deploying

- **App**: push this repo to GitHub and import it into [Vercel](https://vercel.com) or [Railway](https://railway.app). Set the same environment variables there.
- **Database**: use the hosted Postgres URL from Neon/Supabase/RDS as `DATABASE_URL` in production too.
- After deploying, run `npx prisma migrate deploy` (instead of `migrate dev`) against the production database, then run the one-time super-administrator bootstrap command. The demo seed is optional and must not be used in production.

## Operations

Apply committed migrations in a deployed environment with `npx prisma migrate deploy`; use `npx prisma migrate dev` only for local development. Prisma migration rollback is forward-only: create a compensating migration and restore from a tested database backup when necessary. Backups should be encrypted, access-controlled, regularly restored into an isolated environment, and retained according to the clinic’s approved policy.

`DATABASE_URL`, `NEXTAUTH_SECRET`, and notification settings are documented in `.env.example`. Keep `.env` out of source control. Default scheduling display is Asia/Kolkata, while database timestamps are stored in UTC.

### Local imaging worklist test

Set `MLLP_HOST=127.0.0.1` and `MLLP_PORT=2575`, then start the local receiver with `npm run mllp:mock`. It stores each correctly framed ORM message under `storage/mllp-mock` and returns `AA` by default. Set `MOCK_MLLP_ACK_CODE` to `AE` or `AR` to exercise failure handling; raw HL7 is stored but never printed to the terminal.

### Mirth and DICOM Modality Worklist

CareChart sends an `ORM^O01` order to Mirth over MLLP. An order becomes visible through the bundled MWL SCP only after Mirth returns an `AA` acknowledgement, so rejected or failed transmissions are not offered to modalities.

1. In Mirth Connect, create a channel with an **LLP Listener** source connector, `MLLP` transmission mode, and HL7 v2.x inbound data type. Bind it to an available port such as `6661` and configure the source response to return a generated HL7 ACK. Restrict the channel to `ORM^O01` messages and return `AE`/`AR` for messages that do not pass validation.
2. Point `MLLP_HOST` and `MLLP_PORT` in `.env` at the Mirth server and channel port. Keep the receiver application/facility values aligned with the channel.
3. Start the web app, then start the LAN-side MWL process with `npm run mwl:start`. This long-running TCP process must run on a server that can reach the same PostgreSQL database; it cannot run in a request-only/serverless runtime.
4. Configure the tester/modality with calling AE `EMR_APP`, called/server AE `CARECHART_MWL`, the CareChart MWL host's LAN IP, and port `11112`. Leave Station AET blank or query the configured `MWL_STATION_AETITLE` (`CARECHART_MODALITY` by default).
5. Place an imaging order from an active encounter. After Mirth responds `AA`, query the order's scheduled date. Appointment time is used when present; otherwise the order creation time is used.

The MWL endpoint supports C-ECHO and MWL C-FIND with patient name/ID, accession, requested procedure, modality, station AE/name, wildcard matching, and scheduled-date ranges. Set `DICOM_MWL_ALLOWED_CALLING_AETS` to a comma-separated allowlist in shared environments. This integration is self-contained and does not require an external image-sharing gateway.

The bundled JavaScript DIMSE stack describes itself as work in progress. Use this service for integration and acceptance testing; validate a supported production MWL implementation and the full workflow with the hospital's PACS/vendor before clinical deployment.

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

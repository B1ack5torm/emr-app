# Sunrise EMR — starter web app

A real, deployable version of the EMR prototype: Next.js (App Router) + PostgreSQL
(via Prisma) + NextAuth for staff login, with two roles — Front Desk and Doctor.

## What's included

- **Front Desk** — search/register patients (with allergy list) and log a visit,
  which puts the patient into the doctor's queue.
- **Doctor's Desk** — waiting queue, full chart with allergy alert, consultation
  form (notes, diagnosis, prescriptions, tests ordered), and digital sign-off.
- **Patient Records** — searchable history of every patient and every past visit.
- Role-based route protection (`middleware.ts`) and role checks in every API route.
- A normalized Postgres schema via Prisma (`prisma/schema.prisma`).

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

This creates:
- `reception@hospital.com` / `password123` (Front Desk role)
- `doctor@hospital.com` / `password123` (Doctor role)

Change these passwords before using real patient data.

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

## Before using this with real patients

This starter covers the core workflow but is not a compliance-ready product yet.
Before real use, add:
- HTTPS everywhere (handled automatically by Vercel/Railway) and strong, unique passwords for every account.
- Audit logging — who viewed or edited each record, and when.
- Data backup and retention policy.
- A review against India's Digital Personal Data Protection Act and ABDM (Ayushman Bharat Digital Mission) guidelines for health record handling, since this is intended for a hospital in India.

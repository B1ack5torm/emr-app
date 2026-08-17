-- CareChart Phase 1 security, privacy and audit foundations.  This migration is additive.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CLINIC_ADMIN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'NURSE';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'FRONT_DESK';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'BILLING';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'LAB_RADIOLOGY';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PATIENT';

ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TYPE "ConsentStatus" AS ENUM ('PENDING', 'GRANTED', 'WITHDRAWN', 'EXPIRED');
CREATE TYPE "PrivacyRequestType" AS ENUM ('ACCESS', 'CORRECTION', 'EXPORT', 'ERASURE', 'GRIEVANCE');
CREATE TYPE "PrivacyRequestStatus" AS ENUM ('RECEIVED', 'VERIFYING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

CREATE TABLE "AppointmentStatusHistory" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "previousStatus" "AppointmentStatus",
  "newStatus" "AppointmentStatus" NOT NULL,
  "reason" TEXT,
  "changedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppointmentStatusHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AppointmentStatusHistory_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AppointmentStatusHistory_appointmentId_createdAt_idx" ON "AppointmentStatusHistory"("appointmentId", "createdAt");

CREATE TABLE "Consent" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "patientId" TEXT NOT NULL,
  "consentType" TEXT NOT NULL, "privacyNoticeVersion" TEXT NOT NULL, "purpose" TEXT NOT NULL,
  "status" "ConsentStatus" NOT NULL DEFAULT 'PENDING', "capturedAt" TIMESTAMP(3), "captureMethod" TEXT,
  "capturedById" TEXT, "withdrawalAt" TIMESTAMP(3), "guardianName" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Consent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Consent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Consent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Consent_organizationId_patientId_status_idx" ON "Consent"("organizationId", "patientId", "status");

CREATE TABLE "PrivacyRequest" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "patientId" TEXT NOT NULL,
  "type" "PrivacyRequestType" NOT NULL, "status" "PrivacyRequestStatus" NOT NULL DEFAULT 'RECEIVED',
  "details" TEXT, "reviewedById" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PrivacyRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PrivacyRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PrivacyRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PrivacyRequest_organizationId_status_createdAt_idx" ON "PrivacyRequest"("organizationId", "status", "createdAt");

CREATE TABLE "AuditEvent" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "userId" TEXT, "patientId" TEXT,
  "action" TEXT NOT NULL, "resourceType" TEXT NOT NULL, "resourceId" TEXT, "ipAddress" TEXT,
  "requestId" TEXT, "previousValue" JSONB, "newValue" JSONB, "reason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AuditEvent_organizationId_createdAt_idx" ON "AuditEvent"("organizationId", "createdAt");
CREATE INDEX "AuditEvent_organizationId_resourceType_resourceId_idx" ON "AuditEvent"("organizationId", "resourceType", "resourceId");

CREATE TABLE "PasswordResetToken" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");

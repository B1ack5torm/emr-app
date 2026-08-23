CREATE TYPE "IdentifierUse" AS ENUM ('USUAL', 'OFFICIAL', 'TEMP', 'SECONDARY', 'OLD');
CREATE TYPE "ClinicalStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'RESOLVED', 'REMISSION', 'RECURRENCE', 'ENTERED_IN_ERROR');
CREATE TYPE "VerificationStatus" AS ENUM ('UNCONFIRMED', 'PROVISIONAL', 'DIFFERENTIAL', 'CONFIRMED', 'REFUTED', 'ENTERED_IN_ERROR');
CREATE TYPE "AllergySeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING', 'UNKNOWN');
CREATE TYPE "MedicationStatementStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ENTERED_IN_ERROR', 'INTENDED', 'STOPPED', 'ON_HOLD', 'UNKNOWN');
CREATE TYPE "ObservationInterpretation" AS ENUM ('NORMAL', 'ABNORMAL', 'HIGH', 'LOW', 'CRITICAL_HIGH', 'CRITICAL_LOW', 'POSITIVE', 'NEGATIVE', 'INDETERMINATE');
CREATE TYPE "ObservationStatus" AS ENUM ('PRELIMINARY', 'FINAL', 'AMENDED', 'CORRECTED', 'CANCELLED', 'ENTERED_IN_ERROR', 'UNKNOWN');

ALTER TABLE "Allergy"
  ADD COLUMN "category" TEXT,
  ADD COLUMN "clinicalStatus" "ClinicalStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "code" TEXT,
  ADD COLUMN "codingSystem" TEXT,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "onsetDate" TIMESTAMP(3),
  ADD COLUMN "reaction" TEXT,
  ADD COLUMN "recordedById" TEXT,
  ADD COLUMN "severity" "AllergySeverity" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNCONFIRMED';

ALTER TABLE "Patient" ADD COLUMN "mergedIntoId" TEXT;

ALTER TABLE "Prescription"
  ADD COLUMN "codingSystem" TEXT,
  ADD COLUMN "interactionOverrideReason" TEXT,
  ADD COLUMN "medicationCode" TEXT,
  ADD COLUMN "status" "MedicationStatementStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "warnings" JSONB;

CREATE TABLE "PatientIdentifier" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "system" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "use" "IdentifierUse" NOT NULL DEFAULT 'USUAL',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientIdentifier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatientMergeRecord" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "sourcePatientId" TEXT NOT NULL,
  "targetPatientId" TEXT NOT NULL,
  "mergedById" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "sourceSnapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientMergeRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PatientMergeRecord_distinct_patients" CHECK ("sourcePatientId" <> "targetPatientId")
);

CREATE TABLE "ClinicalProblem" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "code" TEXT,
  "codingSystem" TEXT,
  "description" TEXT NOT NULL,
  "clinicalStatus" "ClinicalStatus" NOT NULL DEFAULT 'ACTIVE',
  "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'CONFIRMED',
  "onsetDate" TIMESTAMP(3),
  "resolvedDate" TIMESTAMP(3),
  "notes" TEXT,
  "recordedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClinicalProblem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MedicationStatement" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "medication" TEXT NOT NULL,
  "medicationCode" TEXT,
  "codingSystem" TEXT,
  "status" "MedicationStatementStatus" NOT NULL DEFAULT 'ACTIVE',
  "dose" TEXT,
  "dosageUnit" TEXT,
  "route" TEXT,
  "frequency" TEXT,
  "reason" TEXT,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveTo" TIMESTAMP(3),
  "source" TEXT NOT NULL DEFAULT 'CLINICIAN_REPORTED',
  "notes" TEXT,
  "recordedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationStatement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImmunizationRecord" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "vaccine" TEXT NOT NULL,
  "vaccineCode" TEXT,
  "codingSystem" TEXT,
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "occurrenceDate" TIMESTAMP(3) NOT NULL,
  "lotNumber" TEXT,
  "manufacturer" TEXT,
  "site" TEXT,
  "route" TEXT,
  "doseQuantity" TEXT,
  "reason" TEXT,
  "performer" TEXT,
  "source" TEXT NOT NULL DEFAULT 'CLINICIAN_REPORTED',
  "notes" TEXT,
  "recordedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImmunizationRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatientProcedure" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "code" TEXT,
  "codingSystem" TEXT,
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "performedAt" TIMESTAMP(3),
  "performer" TEXT,
  "bodySite" TEXT,
  "outcome" TEXT,
  "notes" TEXT,
  "recordedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientProcedure_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClinicalFlag" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "code" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "severity" "AllergySeverity" NOT NULL DEFAULT 'UNKNOWN',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "recordedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClinicalFlag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiagnosticObservation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "code" TEXT,
  "codingSystem" TEXT,
  "display" TEXT NOT NULL,
  "valueNumber" DOUBLE PRECISION,
  "valueText" TEXT,
  "valueBoolean" BOOLEAN,
  "unit" TEXT,
  "unitCode" TEXT,
  "referenceLow" DOUBLE PRECISION,
  "referenceHigh" DOUBLE PRECISION,
  "referenceText" TEXT,
  "interpretation" "ObservationInterpretation" NOT NULL DEFAULT 'INDETERMINATE',
  "status" "ObservationStatus" NOT NULL DEFAULT 'FINAL',
  "isCritical" BOOLEAN NOT NULL DEFAULT false,
  "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "specimenType" TEXT,
  "method" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "verifiedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticObservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiagnosticObservation_single_value" CHECK (num_nonnulls("valueNumber", "valueText", "valueBoolean") = 1)
);

CREATE INDEX "PatientIdentifier_patientId_active_idx" ON "PatientIdentifier"("patientId", "active");
CREATE UNIQUE INDEX "PatientIdentifier_organizationId_system_value_key" ON "PatientIdentifier"("organizationId", "system", "value");
CREATE INDEX "PatientMergeRecord_organizationId_createdAt_idx" ON "PatientMergeRecord"("organizationId", "createdAt");
CREATE INDEX "PatientMergeRecord_sourcePatientId_idx" ON "PatientMergeRecord"("sourcePatientId");
CREATE INDEX "PatientMergeRecord_targetPatientId_idx" ON "PatientMergeRecord"("targetPatientId");
CREATE INDEX "ClinicalProblem_organizationId_patientId_clinicalStatus_idx" ON "ClinicalProblem"("organizationId", "patientId", "clinicalStatus");
CREATE INDEX "ClinicalProblem_code_codingSystem_idx" ON "ClinicalProblem"("code", "codingSystem");
CREATE INDEX "MedicationStatement_organizationId_patientId_status_idx" ON "MedicationStatement"("organizationId", "patientId", "status");
CREATE INDEX "MedicationStatement_medicationCode_codingSystem_idx" ON "MedicationStatement"("medicationCode", "codingSystem");
CREATE INDEX "ImmunizationRecord_organizationId_patientId_occurrenceDate_idx" ON "ImmunizationRecord"("organizationId", "patientId", "occurrenceDate");
CREATE INDEX "PatientProcedure_organizationId_patientId_performedAt_idx" ON "PatientProcedure"("organizationId", "patientId", "performedAt");
CREATE INDEX "ClinicalFlag_organizationId_patientId_active_idx" ON "ClinicalFlag"("organizationId", "patientId", "active");
CREATE INDEX "DiagnosticObservation_organizationId_patientId_observedAt_idx" ON "DiagnosticObservation"("organizationId", "patientId", "observedAt");
CREATE INDEX "DiagnosticObservation_orderId_status_idx" ON "DiagnosticObservation"("orderId", "status");
CREATE INDEX "DiagnosticObservation_organizationId_isCritical_reviewedAt_idx" ON "DiagnosticObservation"("organizationId", "isCritical", "reviewedAt");
CREATE INDEX "Allergy_patientId_clinicalStatus_idx" ON "Allergy"("patientId", "clinicalStatus");
CREATE INDEX "Patient_organizationId_name_idx" ON "Patient"("organizationId", "name");
CREATE INDEX "Patient_organizationId_phone_idx" ON "Patient"("organizationId", "phone");
CREATE INDEX "Patient_organizationId_email_idx" ON "Patient"("organizationId", "email");
CREATE INDEX "Patient_organizationId_dateOfBirth_idx" ON "Patient"("organizationId", "dateOfBirth");
CREATE INDEX "Patient_mergedIntoId_idx" ON "Patient"("mergedIntoId");

ALTER TABLE "Patient" ADD CONSTRAINT "Patient_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientIdentifier" ADD CONSTRAINT "PatientIdentifier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientIdentifier" ADD CONSTRAINT "PatientIdentifier_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientMergeRecord" ADD CONSTRAINT "PatientMergeRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientMergeRecord" ADD CONSTRAINT "PatientMergeRecord_sourcePatientId_fkey" FOREIGN KEY ("sourcePatientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientMergeRecord" ADD CONSTRAINT "PatientMergeRecord_targetPatientId_fkey" FOREIGN KEY ("targetPatientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClinicalProblem" ADD CONSTRAINT "ClinicalProblem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClinicalProblem" ADD CONSTRAINT "ClinicalProblem_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicationStatement" ADD CONSTRAINT "MedicationStatement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicationStatement" ADD CONSTRAINT "MedicationStatement_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImmunizationRecord" ADD CONSTRAINT "ImmunizationRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImmunizationRecord" ADD CONSTRAINT "ImmunizationRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientProcedure" ADD CONSTRAINT "PatientProcedure_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientProcedure" ADD CONSTRAINT "PatientProcedure_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClinicalFlag" ADD CONSTRAINT "ClinicalFlag_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClinicalFlag" ADD CONSTRAINT "ClinicalFlag_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiagnosticObservation" ADD CONSTRAINT "DiagnosticObservation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiagnosticObservation" ADD CONSTRAINT "DiagnosticObservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "DiagnosticOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiagnosticObservation" ADD CONSTRAINT "DiagnosticObservation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "PatientIdentifier" ("id", "organizationId", "patientId", "type", "system", "value", "use", "active", "createdAt", "updatedAt")
SELECT concat('pid_', md5(random()::text || clock_timestamp()::text || "id")), "organizationId", "id", 'MRN', 'urn:carechart:mrn', "mrn", 'USUAL', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Patient";

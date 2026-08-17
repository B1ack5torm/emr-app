ALTER TYPE "VisitStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "VisitStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE "VisitStatus" ADD VALUE IF NOT EXISTS 'FINALIZED';
ALTER TYPE "VisitStatus" ADD VALUE IF NOT EXISTS 'AMENDED';
ALTER TYPE "VisitStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

ALTER TABLE "Visit" ADD COLUMN "reasonForVisit" TEXT;
ALTER TABLE "Visit" ADD COLUMN "historyOfPresentIllness" TEXT;
ALTER TABLE "Visit" ADD COLUMN "pastMedicalHistory" TEXT;
ALTER TABLE "Visit" ADD COLUMN "surgicalHistory" TEXT;
ALTER TABLE "Visit" ADD COLUMN "familyHistory" TEXT;
ALTER TABLE "Visit" ADD COLUMN "socialHistory" TEXT;
ALTER TABLE "Visit" ADD COLUMN "reviewOfSystems" TEXT;
ALTER TABLE "Visit" ADD COLUMN "examination" TEXT;
ALTER TABLE "Visit" ADD COLUMN "assessment" TEXT;
ALTER TABLE "Visit" ADD COLUMN "treatmentPlan" TEXT;
ALTER TABLE "Visit" ADD COLUMN "followUpDate" TIMESTAMP(3);
ALTER TABLE "Visit" ADD COLUMN "referralNotes" TEXT;
ALTER TABLE "Visit" ADD COLUMN "privateNote" TEXT;
ALTER TABLE "Visit" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Prescription" ADD COLUMN "genericName" TEXT;
ALTER TABLE "Prescription" ADD COLUMN "strength" TEXT;
ALTER TABLE "Prescription" ADD COLUMN "dose" TEXT;
ALTER TABLE "Prescription" ADD COLUMN "dosageUnit" TEXT;
ALTER TABLE "Prescription" ADD COLUMN "route" TEXT;
ALTER TABLE "Prescription" ADD COLUMN "quantity" INTEGER;
ALTER TABLE "Prescription" ADD COLUMN "foodInstruction" TEXT;
ALTER TABLE "Prescription" ADD COLUMN "startDate" TIMESTAMP(3);
ALTER TABLE "Prescription" ADD COLUMN "directions" TEXT;
ALTER TABLE "Prescription" ADD COLUMN "allergyWarningAcknowledged" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Prescription" ADD COLUMN "finalizedAt" TIMESTAMP(3);
ALTER TABLE "Prescription" ADD COLUMN "reference" TEXT;
CREATE UNIQUE INDEX "Prescription_reference_key" ON "Prescription"("reference");

CREATE TABLE "VitalSign" (
  "id" TEXT NOT NULL, "visitId" TEXT NOT NULL, "heightCm" DOUBLE PRECISION, "weightKg" DOUBLE PRECISION,
  "bmi" DOUBLE PRECISION, "temperatureC" DOUBLE PRECISION, "pulseBpm" INTEGER, "respiratoryRate" INTEGER,
  "systolicBp" INTEGER, "diastolicBp" INTEGER, "oxygenSaturation" DOUBLE PRECISION,
  "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "bmiCalculatedAt" TIMESTAMP(3), "recordedById" TEXT NOT NULL,
  CONSTRAINT "VitalSign_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VitalSign_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "VitalSign_visitId_measuredAt_idx" ON "VitalSign"("visitId", "measuredAt");

CREATE TABLE "DiagnosisEntry" (
  "id" TEXT NOT NULL, "visitId" TEXT NOT NULL, "code" TEXT, "codingSystem" TEXT, "description" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false, "clinicalStatus" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosisEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiagnosisEntry_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "DiagnosisEntry_visitId_idx" ON "DiagnosisEntry"("visitId");

CREATE TABLE "EncounterAmendment" (
  "id" TEXT NOT NULL, "visitId" TEXT NOT NULL, "authorId" TEXT NOT NULL, "reason" TEXT NOT NULL,
  "originalContent" JSONB NOT NULL, "amendedContent" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EncounterAmendment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EncounterAmendment_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "EncounterAmendment_visitId_createdAt_idx" ON "EncounterAmendment"("visitId", "createdAt");

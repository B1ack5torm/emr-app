CREATE TABLE "PatientPortalAccount" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "patientId" TEXT NOT NULL,
    CONSTRAINT "PatientPortalAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PatientPortalAccount_email_key" ON "PatientPortalAccount"("email");
CREATE UNIQUE INDEX "PatientPortalAccount_patientId_key" ON "PatientPortalAccount"("patientId");

ALTER TABLE "PatientPortalAccount" ADD CONSTRAINT "PatientPortalAccount_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

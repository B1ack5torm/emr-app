CREATE TYPE "AppointmentRequestStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

CREATE TABLE "AppointmentRequest" (
    "id" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "patientEmail" TEXT NOT NULL,
    "patientPhone" TEXT NOT NULL,
    "reason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "status" "AppointmentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "organizationId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    CONSTRAINT "AppointmentRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AppointmentRequest_doctorId_requestedAt_idx" ON "AppointmentRequest"("doctorId", "requestedAt");
CREATE INDEX "AppointmentRequest_organizationId_requestedAt_idx" ON "AppointmentRequest"("organizationId", "requestedAt");

ALTER TABLE "AppointmentRequest" ADD CONSTRAINT "AppointmentRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentRequest" ADD CONSTRAINT "AppointmentRequest_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

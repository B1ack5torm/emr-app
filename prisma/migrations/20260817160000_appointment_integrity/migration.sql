ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'REQUESTED';
ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'CONFIRMED';
ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'IN_CONSULTATION';
ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';
ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'RESCHEDULED';
ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'NO_SHOW';

ALTER TABLE "AppointmentRequest" ADD COLUMN "bookingReference" TEXT;
ALTER TABLE "AppointmentRequest" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "AppointmentRequest" ADD COLUMN "privacyAcceptedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "AppointmentRequest_bookingReference_key" ON "AppointmentRequest"("bookingReference");
CREATE UNIQUE INDEX "AppointmentRequest_idempotencyKey_key" ON "AppointmentRequest"("idempotencyKey");

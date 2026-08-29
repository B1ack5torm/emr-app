ALTER TYPE "AppointmentRequestStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "AppointmentRequestStatus" ADD VALUE IF NOT EXISTS 'NO_SHOW';

ALTER TABLE "AppointmentRequest" ADD COLUMN IF NOT EXISTS "statusReason" TEXT;

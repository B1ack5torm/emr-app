-- dateOfBirth was already added in 20260802112023_add_imaging_orders; this migration is now a no-op.
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3);
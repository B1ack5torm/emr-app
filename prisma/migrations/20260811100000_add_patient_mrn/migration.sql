ALTER TABLE "Patient" ADD COLUMN "mrn" TEXT;

WITH numbered_patients AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "organizationId" ORDER BY "createdAt", "id") AS "number"
  FROM "Patient"
)
UPDATE "Patient"
SET "mrn" = 'MRN-' || LPAD(numbered_patients."number"::TEXT, 6, '0')
FROM numbered_patients
WHERE "Patient"."id" = numbered_patients."id";

ALTER TABLE "Patient" ALTER COLUMN "mrn" SET NOT NULL;

CREATE UNIQUE INDEX "Patient_organizationId_mrn_key" ON "Patient"("organizationId", "mrn");

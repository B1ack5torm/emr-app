ALTER TABLE "ImagingOrder"
ADD COLUMN "messageControlId" TEXT,
ADD COLUMN "procedureCode" TEXT,
ADD COLUMN "clinicalIndication" TEXT,
ADD COLUMN "ackCode" TEXT,
ADD COLUMN "ackErrorText" TEXT;

UPDATE "ImagingOrder"
SET
  "messageControlId" = 'LEGACY-' || "id",
  "procedureCode" = CASE "modality"::text
    WHEN 'XRAY' THEN 'XR-LEGACY'
    WHEN 'CT' THEN 'CT-LEGACY'
    WHEN 'MRI' THEN 'MR-LEGACY'
    WHEN 'ULTRASOUND' THEN 'US-LEGACY'
    WHEN 'NUCLEAR' THEN 'NM-LEGACY'
    ELSE 'OT-LEGACY'
  END,
  "clinicalIndication" = 'Not captured in legacy order'
WHERE "messageControlId" IS NULL;

ALTER TABLE "ImagingOrder"
ALTER COLUMN "messageControlId" SET NOT NULL,
ALTER COLUMN "procedureCode" SET NOT NULL,
ALTER COLUMN "clinicalIndication" SET NOT NULL;

CREATE UNIQUE INDEX "ImagingOrder_messageControlId_key" ON "ImagingOrder"("messageControlId");

CREATE TABLE "ImagingRecommendation" (
  "id" TEXT NOT NULL,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "modality" TEXT NOT NULL,
  "bodyPart" TEXT,
  "description" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  CONSTRAINT "ImagingRecommendation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ImagingRecommendation_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ImagingRecommendation_visitId_idx" ON "ImagingRecommendation"("visitId");

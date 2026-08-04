-- CreateEnum
CREATE TYPE "ImagingModality" AS ENUM ('XRAY', 'CT', 'MRI', 'ULTRASOUND', 'NUCLEAR', 'OTHER');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('ORDERED', 'SENT', 'ACK_OK', 'ACK_ERROR', 'FAILED');

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ImagingOrder" (
    "id" TEXT NOT NULL,
    "accessionNumber" TEXT NOT NULL,
    "modality" "ImagingModality" NOT NULL,
    "procedureDescription" TEXT NOT NULL,
    "bodyPart" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'ORDERED',
    "hl7Sent" TEXT,
    "hl7AckReceived" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "visitId" TEXT NOT NULL,

    CONSTRAINT "ImagingOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImagingOrder_accessionNumber_key" ON "ImagingOrder"("accessionNumber");

-- AddForeignKey
ALTER TABLE "ImagingOrder" ADD CONSTRAINT "ImagingOrder_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PHARMACIST';

CREATE TYPE "PharmacyOrderStatus" AS ENUM ('PENDING', 'DISPENSED');

CREATE TABLE "PharmacyOrder" (
  "id" TEXT NOT NULL,
  "status" "PharmacyOrderStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dispensedAt" TIMESTAMP(3),
  "visitId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  CONSTRAINT "PharmacyOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PharmacyOrder_visitId_key" ON "PharmacyOrder"("visitId");
CREATE INDEX "PharmacyOrder_organizationId_status_idx" ON "PharmacyOrder"("organizationId", "status");
ALTER TABLE "PharmacyOrder" ADD CONSTRAINT "PharmacyOrder_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PharmacyOrder" ADD CONSTRAINT "PharmacyOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PharmacyOrder" ADD CONSTRAINT "PharmacyOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PharmacyOrderItem" ("id" TEXT NOT NULL, "medicine" TEXT NOT NULL, "dosage" TEXT, "frequency" TEXT, "duration" TEXT, "pharmacyOrderId" TEXT NOT NULL, CONSTRAINT "PharmacyOrderItem_pkey" PRIMARY KEY ("id"));
ALTER TABLE "PharmacyOrderItem" ADD CONSTRAINT "PharmacyOrderItem_pharmacyOrderId_fkey" FOREIGN KEY ("pharmacyOrderId") REFERENCES "PharmacyOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PharmacyInvoice" ("id" TEXT NOT NULL, "invoiceNo" INTEGER NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "pharmacyOrderId" TEXT NOT NULL, "patientId" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "subtotal" INTEGER NOT NULL DEFAULT 0, "taxTotal" INTEGER NOT NULL DEFAULT 0, "grandTotal" INTEGER NOT NULL DEFAULT 0, "createdById" TEXT, CONSTRAINT "PharmacyInvoice_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "PharmacyInvoice_pharmacyOrderId_key" ON "PharmacyInvoice"("pharmacyOrderId");
CREATE UNIQUE INDEX "PharmacyInvoice_organizationId_invoiceNo_key" ON "PharmacyInvoice"("organizationId", "invoiceNo");
ALTER TABLE "PharmacyInvoice" ADD CONSTRAINT "PharmacyInvoice_pharmacyOrderId_fkey" FOREIGN KEY ("pharmacyOrderId") REFERENCES "PharmacyOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PharmacyInvoice" ADD CONSTRAINT "PharmacyInvoice_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PharmacyInvoice" ADD CONSTRAINT "PharmacyInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PharmacyInvoice" ADD CONSTRAINT "PharmacyInvoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PharmacyInvoiceItem" ("id" TEXT NOT NULL, "invoiceId" TEXT NOT NULL, "description" TEXT NOT NULL, "quantity" INTEGER NOT NULL DEFAULT 1, "unitPrice" INTEGER NOT NULL DEFAULT 0, "taxRatePercent" INTEGER NOT NULL DEFAULT 0, "amount" INTEGER NOT NULL DEFAULT 0, "taxAmount" INTEGER NOT NULL DEFAULT 0, "total" INTEGER NOT NULL DEFAULT 0, CONSTRAINT "PharmacyInvoiceItem_pkey" PRIMARY KEY ("id"));
ALTER TABLE "PharmacyInvoiceItem" ADD CONSTRAINT "PharmacyInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PharmacyInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

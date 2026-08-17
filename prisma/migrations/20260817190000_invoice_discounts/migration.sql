ALTER TABLE "InvoiceItem" ADD COLUMN "discountAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "InvoiceItem" ADD COLUMN "discountAuthorizedById" TEXT;

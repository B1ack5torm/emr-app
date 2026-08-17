ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'ISSUED';
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';

CREATE TABLE "ClinicLocation" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "name" TEXT NOT NULL, "code" TEXT NOT NULL,
  "address" TEXT, "phone" TEXT, "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata', "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClinicLocation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClinicLocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ClinicLocation_organizationId_code_key" ON "ClinicLocation"("organizationId", "code");
CREATE INDEX "ClinicLocation_organizationId_active_idx" ON "ClinicLocation"("organizationId", "active");

CREATE TABLE "Department" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "name" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Department_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Department_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Department_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "ClinicLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Department_clinicId_name_key" ON "Department"("clinicId", "name");
CREATE INDEX "Department_organizationId_active_idx" ON "Department"("organizationId", "active");

CREATE TABLE "PractitionerProfile" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "userId" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "departmentId" TEXT,
  "specialty" TEXT NOT NULL, "qualification" TEXT, "registrationNumber" TEXT, "defaultAppointmentMinutes" INTEGER NOT NULL DEFAULT 30, "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "PractitionerProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PractitionerProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PractitionerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PractitionerProfile_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "ClinicLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PractitionerProfile_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PractitionerProfile_userId_key" ON "PractitionerProfile"("userId");
CREATE INDEX "PractitionerProfile_organizationId_clinicId_specialty_active_idx" ON "PractitionerProfile"("organizationId", "clinicId", "specialty", "active");

CREATE TABLE "PractitionerSchedule" (
  "id" TEXT NOT NULL, "practitionerId" TEXT NOT NULL, "dayOfWeek" INTEGER NOT NULL, "startMinute" INTEGER NOT NULL,
  "endMinute" INTEGER NOT NULL, "appointmentMinutes" INTEGER NOT NULL DEFAULT 30, "validFrom" TIMESTAMP(3), "validTo" TIMESTAMP(3), "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "PractitionerSchedule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PractitionerSchedule_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PractitionerSchedule_practitionerId_dayOfWeek_startMinute_endMinute_key" ON "PractitionerSchedule"("practitionerId", "dayOfWeek", "startMinute", "endMinute");
CREATE INDEX "PractitionerSchedule_practitionerId_dayOfWeek_active_idx" ON "PractitionerSchedule"("practitionerId", "dayOfWeek", "active");

CREATE TABLE "ScheduleBreak" (
  "id" TEXT NOT NULL, "scheduleId" TEXT NOT NULL, "startMinute" INTEGER NOT NULL, "endMinute" INTEGER NOT NULL, "label" TEXT,
  CONSTRAINT "ScheduleBreak_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ScheduleBreak_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "PractitionerSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ScheduleBreak_scheduleId_idx" ON "ScheduleBreak"("scheduleId");

CREATE TABLE "BlockedPeriod" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "practitionerId" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL, "endsAt" TIMESTAMP(3) NOT NULL, "reason" TEXT NOT NULL, "createdById" TEXT NOT NULL,
  CONSTRAINT "BlockedPeriod_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BlockedPeriod_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BlockedPeriod_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "ClinicLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BlockedPeriod_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "PractitionerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "BlockedPeriod_organizationId_clinicId_startsAt_endsAt_idx" ON "BlockedPeriod"("organizationId", "clinicId", "startsAt", "endsAt");
CREATE INDEX "BlockedPeriod_practitionerId_startsAt_endsAt_idx" ON "BlockedPeriod"("practitionerId", "startsAt", "endsAt");

CREATE TABLE "Holiday" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "date" TIMESTAMP(3) NOT NULL, "name" TEXT NOT NULL,
  CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Holiday_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Holiday_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "ClinicLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Holiday_clinicId_date_key" ON "Holiday"("clinicId", "date");
CREATE INDEX "Holiday_organizationId_date_idx" ON "Holiday"("organizationId", "date");

CREATE TABLE "AppointmentType" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "durationMinutes" INTEGER NOT NULL DEFAULT 30, "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "AppointmentType_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AppointmentType_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AppointmentType_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "ClinicLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AppointmentType_clinicId_name_key" ON "AppointmentType"("clinicId", "name");
CREATE INDEX "AppointmentType_organizationId_active_idx" ON "AppointmentType"("organizationId", "active");

ALTER TABLE "Appointment" ADD COLUMN "clinicId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "appointmentTypeId" TEXT;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "ClinicLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_appointmentTypeId_fkey" FOREIGN KEY ("appointmentTypeId") REFERENCES "AppointmentType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppointmentRequest" ADD COLUMN "clinicId" TEXT;
ALTER TABLE "AppointmentRequest" ADD COLUMN "appointmentTypeId" TEXT;
ALTER TABLE "AppointmentRequest" ADD CONSTRAINT "AppointmentRequest_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "ClinicLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppointmentRequest" ADD CONSTRAINT "AppointmentRequest_appointmentTypeId_fkey" FOREIGN KEY ("appointmentTypeId") REFERENCES "AppointmentType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TYPE "DiagnosticOrderType" AS ENUM ('LABORATORY', 'IMAGING');
CREATE TYPE "DiagnosticPriority" AS ENUM ('ROUTINE', 'URGENT', 'STAT');
CREATE TYPE "DiagnosticOrderStatus" AS ENUM ('CREATED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED', 'CANCELLED');
CREATE TABLE "DiagnosticOrder" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "clinicId" TEXT, "patientId" TEXT NOT NULL, "visitId" TEXT NOT NULL,
  "orderingPractitionerId" TEXT NOT NULL, "orderNumber" TEXT NOT NULL, "accessionNumber" TEXT, "type" "DiagnosticOrderType" NOT NULL,
  "procedureCode" TEXT, "procedureName" TEXT NOT NULL, "clinicalIndication" TEXT, "priority" "DiagnosticPriority" NOT NULL DEFAULT 'ROUTINE',
  "scheduledAt" TIMESTAMP(3), "status" "DiagnosticOrderStatus" NOT NULL DEFAULT 'CREATED', "resultSummary" TEXT, "externalSystemId" TEXT,
  "reviewedAt" TIMESTAMP(3), "reviewedById" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticOrder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiagnosticOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DiagnosticOrder_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "ClinicLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "DiagnosticOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DiagnosticOrder_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DiagnosticOrder_orderingPractitionerId_fkey" FOREIGN KEY ("orderingPractitionerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DiagnosticOrder_organizationId_orderNumber_key" ON "DiagnosticOrder"("organizationId", "orderNumber");
CREATE UNIQUE INDEX "DiagnosticOrder_organizationId_accessionNumber_key" ON "DiagnosticOrder"("organizationId", "accessionNumber");
CREATE INDEX "DiagnosticOrder_organizationId_type_status_createdAt_idx" ON "DiagnosticOrder"("organizationId", "type", "status", "createdAt");
CREATE INDEX "DiagnosticOrder_organizationId_patientId_createdAt_idx" ON "DiagnosticOrder"("organizationId", "patientId", "createdAt");

CREATE TABLE "DiagnosticOrderStatusHistory" (
  "id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "previousStatus" "DiagnosticOrderStatus", "newStatus" "DiagnosticOrderStatus" NOT NULL,
  "reason" TEXT, "changedById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiagnosticOrderStatusHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiagnosticOrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "DiagnosticOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "DiagnosticOrderStatusHistory_orderId_createdAt_idx" ON "DiagnosticOrderStatusHistory"("orderId", "createdAt");

CREATE TABLE "ServiceCatalogItem" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "category" "ItemCategory" NOT NULL,
  "taxable" BOOLEAN NOT NULL DEFAULT false, "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "ServiceCatalogItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServiceCatalogItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ServiceCatalogItem_organizationId_code_key" ON "ServiceCatalogItem"("organizationId", "code");
CREATE INDEX "ServiceCatalogItem_organizationId_active_idx" ON "ServiceCatalogItem"("organizationId", "active");

CREATE TABLE "ClinicPrice" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "serviceId" TEXT NOT NULL, "unitPrice" INTEGER NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "ClinicPrice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClinicPrice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ClinicPrice_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "ClinicLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ClinicPrice_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceCatalogItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ClinicPrice_clinicId_serviceId_key" ON "ClinicPrice"("clinicId", "serviceId");
CREATE INDEX "ClinicPrice_organizationId_active_idx" ON "ClinicPrice"("organizationId", "active");

CREATE TABLE "TaxConfiguration" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "name" TEXT NOT NULL, "ratePercent" DOUBLE PRECISION NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true, "effectiveFrom" TIMESTAMP(3), "effectiveTo" TIMESTAMP(3),
  CONSTRAINT "TaxConfiguration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TaxConfiguration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TaxConfiguration_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "ClinicLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "TaxConfiguration_organizationId_clinicId_active_idx" ON "TaxConfiguration"("organizationId", "clinicId", "active");

ALTER TABLE "Payment" ADD COLUMN "receiptNumber" TEXT;
CREATE UNIQUE INDEX "Payment_receiptNumber_key" ON "Payment"("receiptNumber");
CREATE TABLE "Refund" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "invoiceId" TEXT NOT NULL, "paymentId" TEXT, "amount" INTEGER NOT NULL,
  "reason" TEXT NOT NULL, "reference" TEXT, "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Refund_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Refund_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Refund_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Refund_organizationId_invoiceId_createdAt_idx" ON "Refund"("organizationId", "invoiceId", "createdAt");

CREATE TABLE "StoredDocument" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "patientId" TEXT NOT NULL, "visitId" TEXT, "diagnosticOrderId" TEXT,
  "originalName" TEXT NOT NULL, "contentType" TEXT NOT NULL, "sizeBytes" INTEGER NOT NULL, "storageKey" TEXT NOT NULL,
  "checksumSha256" TEXT NOT NULL, "uploadedById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "deletedAt" TIMESTAMP(3),
  CONSTRAINT "StoredDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StoredDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StoredDocument_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StoredDocument_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "StoredDocument_diagnosticOrderId_fkey" FOREIGN KEY ("diagnosticOrderId") REFERENCES "DiagnosticOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "StoredDocument_storageKey_key" ON "StoredDocument"("storageKey");
CREATE INDEX "StoredDocument_organizationId_patientId_createdAt_idx" ON "StoredDocument"("organizationId", "patientId", "createdAt");
CREATE INDEX "StoredDocument_organizationId_diagnosticOrderId_idx" ON "StoredDocument"("organizationId", "diagnosticOrderId");

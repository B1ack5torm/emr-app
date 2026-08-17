import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

async function main() {
  const seedPassword = process.env.SEED_PASSWORD || randomBytes(12).toString("base64url");
  const passwordHash = await bcrypt.hash(seedPassword, 12);
  const org = await prisma.organization.upsert({ where: { slug: "demo-hospital" }, update: {}, create: { name: "Demo Hospital", slug: "demo-hospital" } });
  const users = [
    { email: "admin@hospital.com", name: "Admin User", role: "ADMIN" as Role },
    { email: "reception@hospital.com", name: "Front Desk", role: "RECEPTION" as Role },
    { email: "doctor@hospital.com", name: "Asha Rao", role: "DOCTOR" as Role },
    { email: "nurse@hospital.com", name: "Demo Nurse", role: "NURSE" as Role },
    { email: "billing@hospital.com", name: "Demo Billing", role: "BILLING" as Role },
  ];
  const seeded = new Map<string, any>();
  for (const user of users) seeded.set(user.email, await prisma.user.upsert({ where: { email: user.email }, update: {}, create: { ...user, passwordHash, status: "ACTIVE", organizationId: org.id, mustChangePassword: true } }));

  const clinic = await prisma.clinicLocation.upsert({ where: { organizationId_code: { organizationId: org.id, code: "DEMO01" } }, update: {}, create: { organizationId: org.id, name: "CareChart Demo Clinic", code: "DEMO01", address: "Fictional Demo Address, Bengaluru", timezone: "Asia/Kolkata" } });
  const department = await prisma.department.upsert({ where: { clinicId_name: { clinicId: clinic.id, name: "General Medicine" } }, update: {}, create: { organizationId: org.id, clinicId: clinic.id, name: "General Medicine" } });
  const doctor = seeded.get("doctor@hospital.com");
  const profile = await prisma.practitionerProfile.upsert({ where: { userId: doctor.id }, update: { clinicId: clinic.id, departmentId: department.id }, create: { organizationId: org.id, userId: doctor.id, clinicId: clinic.id, departmentId: department.id, specialty: "General Medicine", qualification: "MBBS", registrationNumber: "DEMO-REG-001" } });
  for (const dayOfWeek of [1, 2, 3, 4, 5, 6]) await prisma.practitionerSchedule.upsert({ where: { practitionerId_dayOfWeek_startMinute_endMinute: { practitionerId: profile.id, dayOfWeek, startMinute: 540, endMinute: 1020 } }, update: {}, create: { practitionerId: profile.id, dayOfWeek, startMinute: 540, endMinute: 1020, appointmentMinutes: 30, breaks: { create: [{ startMinute: 780, endMinute: 840, label: "Lunch" }] } } });
  await prisma.appointmentType.upsert({ where: { clinicId_name: { clinicId: clinic.id, name: "General consultation" } }, update: {}, create: { organizationId: org.id, clinicId: clinic.id, name: "General consultation", durationMinutes: 30 } });
  for (const service of [{ code: "CONSULT", name: "General consultation", category: "CONSULTATION" as const, unitPrice: 50000 }, { code: "CBC", name: "Complete blood count", category: "TEST" as const, unitPrice: 35000 }]) {
    const item = await prisma.serviceCatalogItem.upsert({ where: { organizationId_code: { organizationId: org.id, code: service.code } }, update: {}, create: { organizationId: org.id, code: service.code, name: service.name, category: service.category } });
    await prisma.clinicPrice.upsert({ where: { clinicId_serviceId: { clinicId: clinic.id, serviceId: item.id } }, update: {}, create: { organizationId: org.id, clinicId: clinic.id, serviceId: item.id, unitPrice: service.unitPrice } });
  }
  console.log("Seeded fictional Demo Hospital data.");
  console.log(`Temporary password for newly created accounts: ${seedPassword}`);
  console.log("Set SEED_PASSWORD to choose it. Existing account passwords are never overwritten.");
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(async () => prisma.$disconnect());

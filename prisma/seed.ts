import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password123", 10);

  const org = await prisma.organization.upsert({
    where: { slug: "demo-hospital" },
    update: {},
    create: { name: "Demo Hospital", slug: "demo-hospital" },
  });

  await prisma.user.upsert({
    where: { email: "admin@hospital.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@hospital.com",
      passwordHash: password,
      role: "ADMIN",
      status: "ACTIVE",
      organizationId: org.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "pharmacist@hospital.com" }, update: {},
    create: { name: "Pharmacy User", email: "pharmacist@hospital.com", passwordHash: password, role: "PHARMACIST", status: "ACTIVE", organizationId: org.id },
  });

  await prisma.user.upsert({
    where: { email: "reception@hospital.com" },
    update: {},
    create: {
      name: "Front Desk",
      email: "reception@hospital.com",
      passwordHash: password,
      role: "RECEPTION",
      status: "ACTIVE",
      organizationId: org.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "doctor@hospital.com" },
    update: {},
    create: {
      name: "Asha Rao",
      email: "doctor@hospital.com",
      passwordHash: password,
      role: "DOCTOR",
      status: "ACTIVE",
      organizationId: org.id,
    },
  });

  console.log("Seeded organization: Demo Hospital");
  console.log("  admin@hospital.com / password123 (Admin)");
  console.log("  reception@hospital.com / password123 (Front Desk)");
  console.log("  doctor@hospital.com / password123 (Doctor)");
  console.log("  pharmacist@hospital.com / password123 (Pharmacist)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

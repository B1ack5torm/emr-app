import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password123", 10);

  await prisma.user.upsert({
    where: { email: "reception@hospital.com" },
    update: {},
    create: {
      name: "Front Desk",
      email: "reception@hospital.com",
      passwordHash: password,
      role: "RECEPTION",
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
    },
  });

  console.log("Seeded demo users:");
  console.log("  reception@hospital.com / password123");
  console.log("  doctor@hospital.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

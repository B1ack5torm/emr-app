import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function required(name: string) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function assertStrongPassword(password: string) {
  if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    throw new Error("BOOTSTRAP_SUPER_ADMIN_PASSWORD must contain at least 12 characters, including upper-case, lower-case, number, and symbol.");
  }
}

async function main() {
  const existing = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" }, select: { email: true } });
  if (existing) throw new Error(`A super administrator already exists (${existing.email}). Bootstrap was not run.`);

  const name = required("BOOTSTRAP_SUPER_ADMIN_NAME");
  const email = required("BOOTSTRAP_SUPER_ADMIN_EMAIL").toLowerCase();
  const password = required("BOOTSTRAP_SUPER_ADMIN_PASSWORD");
  assertStrongPassword(password);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("BOOTSTRAP_SUPER_ADMIN_EMAIL must be a valid email address.");

  const organizationName = String(process.env.BOOTSTRAP_PLATFORM_ORG_NAME || "CareChart Platform").trim();
  const organizationSlug = String(process.env.BOOTSTRAP_PLATFORM_ORG_SLUG || "carechart-platform").trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(organizationSlug)) throw new Error("BOOTSTRAP_PLATFORM_ORG_SLUG must be a lowercase URL slug.");
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.upsert({
      where: { slug: organizationSlug },
      update: {},
      create: { name: organizationName, slug: organizationSlug },
    });
    return tx.user.create({
      data: { name, email, passwordHash, role: "SUPER_ADMIN", status: "ACTIVE", organizationId: organization.id },
      select: { id: true, email: true },
    });
  });

  console.log(`Created super administrator ${user.email}. The password was not printed.`);
}

main()
  .catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());

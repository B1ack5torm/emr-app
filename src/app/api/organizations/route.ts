import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET() {
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(orgs);
}

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function POST(request: Request) {
  const access = await requirePermission("user:manage");
  if (access.response) return access.response;
  if (access.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only a Super Admin can create a hospital account." }, { status: 403 });
  }

  const { hospitalName, adminName, adminEmail, adminPassword } = await request.json();
  const name = String(hospitalName || "").trim();
  const email = String(adminEmail || "").trim().toLowerCase();
  const administratorName = String(adminName || "").trim();

  if (!name || !administratorName || !email || !adminPassword) {
    return NextResponse.json({ error: "Hospital name and administrator details are required." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid administrator email address." }, { status: 400 });
  }
  if (String(adminPassword).length < 12 || !/[A-Za-z]/.test(adminPassword) || !/\d/.test(adminPassword)) {
    return NextResponse.json({ error: "Password must be at least 12 characters and contain a letter and number." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

  const baseSlug = slugify(name);
  if (!baseSlug) return NextResponse.json({ error: "Enter a valid hospital name." }, { status: 400 });
  let slug = baseSlug;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const organization = await prisma.organization.create({
    data: {
      name,
      slug,
      users: {
        create: { name: administratorName, email, passwordHash, role: "ADMIN", status: "ACTIVE", mustChangePassword: true },
      },
    },
  });

  await audit({
    organizationId: access.user.organizationId,
    userId: access.user.id,
    action: "HOSPITAL_ACCOUNT_CREATED",
    resourceType: "Organization",
    resourceId: organization.id,
    newValue: { hospitalName: organization.name, administratorEmail: email },
  });

  return NextResponse.json({ id: organization.id, name: organization.name }, { status: 201 });
}

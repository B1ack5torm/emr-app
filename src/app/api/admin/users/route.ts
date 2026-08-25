import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { audit, requirePermission } from "@/lib/security";

const assignableRoles = ["CLINIC_ADMIN", "ADMIN", "DOCTOR", "NURSE", "FRONT_DESK", "RECEPTION", "BILLING", "LAB_RADIOLOGY"];

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requirePermission("user:manage");
  if (access.response) return access.response;
  const session = { user: access.user } as any;

  const users = await prisma.user.findMany({
    where: (session.user as any).role === "SUPER_ADMIN"
      ? { OR: [{ organizationId: (session.user as any).organizationId }, { id: (session.user as any).id }] }
      : { organizationId: (session.user as any).organizationId },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const access = await requirePermission("user:manage");
  if (access.response) return access.response;
  const session = { user: access.user } as any;

  const organizationId = (session.user as any).organizationId;
  const { name, email, password, role } = await req.json();

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: "Name, email, password and role are required." }, { status: 400 });
  }
  if (!assignableRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }
  if (password.length < 12 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return NextResponse.json({ error: "Password must be at least 12 characters and contain a letter and number." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role, status: "ACTIVE", organizationId, mustChangePassword: true },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
  });
  await audit({ organizationId, userId: (session.user as any).id, action: "USER_CREATED", resourceType: "User", resourceId: user.id, newValue: { role: user.role, status: user.status }, request: req });

  return NextResponse.json(user, { status: 201 });
}

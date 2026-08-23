import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { mode, name, email, password } = body;

  if (!name || !email || !password || !mode) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  if (mode === "join") {
    const organizationId = body.organizationId;
    if (!organizationId) return NextResponse.json({ error: "Please choose an organization to join." }, { status: 400 });

    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) return NextResponse.json({ error: "Organization not found." }, { status: 404 });

    await prisma.user.create({
      data: { name, email, passwordHash, role: null, status: "PENDING", organizationId: org.id },
    });

    return NextResponse.json({ success: true, autoApproved: false }, { status: 201 });
  }

  return NextResponse.json({ error: "Hospital accounts can only be created by a Super Admin." }, { status: 403 });
}

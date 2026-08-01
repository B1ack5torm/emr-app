import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const invite = await prisma.invite.findUnique({ where: { token: params.token } });
  if (!invite) return NextResponse.json({ error: "Invalid invitation link." }, { status: 404 });
  if (invite.acceptedAt) return NextResponse.json({ error: "This invitation has already been used." }, { status: 410 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: "This invitation has expired." }, { status: 410 });

  const { name, password } = await req.json();
  if (!name || !password) return NextResponse.json({ error: "Name and password are required." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existingUser) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email: invite.email,
      passwordHash,
      role: invite.role,
      status: "ACTIVE",
      organizationId: invite.organizationId,
    },
  });

  await prisma.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });

  return NextResponse.json({ success: true });
}
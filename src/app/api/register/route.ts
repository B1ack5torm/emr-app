import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// POST /api/register  { name, email, password, role }
// Publicly creates a new staff account. Role is restricted to RECEPTION or DOCTOR —
// ADMIN accounts should be created directly in the database, not through self-registration.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, password, role } = body;

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (!["RECEPTION", "DOCTOR"].includes(role)) {
    return NextResponse.json({ error: "Invalid role selected." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: { name, email, passwordHash, role },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
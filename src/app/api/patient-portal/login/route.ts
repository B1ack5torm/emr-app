import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createPatientSession } from "@/lib/patient-session";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

  const account = await prisma.patientPortalAccount.findUnique({ where: { email: normalizedEmail }, select: { id: true, passwordHash: true } });
  if (!account || !(await bcrypt.compare(password, account.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  await createPatientSession(account.id);
  return NextResponse.json({ success: true });
}

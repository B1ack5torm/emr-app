import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { mrn, email, dateOfBirth, password } = await req.json();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedMrn = String(mrn || "").trim().toUpperCase();

  if (!normalizedMrn || !normalizedEmail || !dateOfBirth || !password) {
    return NextResponse.json({ error: "MRN, email, date of birth, and password are required." }, { status: 400 });
  }
  if (String(password).length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  const patient = await prisma.patient.findFirst({
    where: { mrn: normalizedMrn, email: { equals: normalizedEmail, mode: "insensitive" } },
    select: { id: true, dateOfBirth: true, portalAccount: { select: { id: true } } },
  });
  const suppliedDob = new Date(`${dateOfBirth}T00:00:00.000Z`);
  const dobMatches = patient?.dateOfBirth && !Number.isNaN(suppliedDob.getTime()) && patient.dateOfBirth.toISOString().slice(0, 10) === suppliedDob.toISOString().slice(0, 10);
  if (!patient || !dobMatches) return NextResponse.json({ error: "We could not verify those patient details. Contact your clinic for help." }, { status: 404 });
  if (patient.portalAccount) return NextResponse.json({ error: "A portal account is already active for this patient. Please sign in." }, { status: 409 });

  const [staffAccount, otherPortalAccount] = await Promise.all([
    prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } }),
    prisma.patientPortalAccount.findUnique({ where: { email: normalizedEmail }, select: { id: true } }),
  ]);
  if (staffAccount || otherPortalAccount) return NextResponse.json({ error: "This email is already used by another account." }, { status: 409 });

  await prisma.patientPortalAccount.create({
    data: { patientId: patient.id, email: normalizedEmail, passwordHash: await bcrypt.hash(password, 10) },
  });
  return NextResponse.json({ success: true }, { status: 201 });
}

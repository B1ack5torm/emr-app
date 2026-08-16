import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const organizationId = (session.user as any).organizationId;
  const role = (session.user as any).role;

  const patient = await prisma.patient.findUnique({
    where: { id: params.id },
    include: { allergies: true, visits: { orderBy: { createdAt: "desc" }, include: { prescriptions: true, testsOrdered: true, doctor: { select: { name: true } } } } },
  });

  if (!patient || (role !== "SUPER_ADMIN" && patient.organizationId !== organizationId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(patient);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (!["RECEPTION", "ADMIN", "SUPER_ADMIN"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const patient = await prisma.patient.findUnique({ where: { id: params.id }, select: { organizationId: true, portalAccount: { select: { id: true } } } });
  if (!patient || (role !== "SUPER_ADMIN" && patient.organizationId !== (session.user as any).organizationId)) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const body = await req.json();
  const name = String(body.name || "").trim();
  const gender = String(body.gender || "");
  const age = Number(body.age);
  const email = String(body.email || "").trim().toLowerCase();
  const dateOfBirth = body.dateOfBirth ? new Date(`${body.dateOfBirth}T00:00:00.000Z`) : null;
  if (!name || !Number.isInteger(age) || age < 0 || age > 130 || !["MALE", "FEMALE", "OTHER"].includes(gender)) {
    return NextResponse.json({ error: "A valid name, age, and gender are required." }, { status: 400 });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (dateOfBirth && (Number.isNaN(dateOfBirth.getTime()) || dateOfBirth > new Date())) return NextResponse.json({ error: "Enter a valid date of birth." }, { status: 400 });
  if (patient.portalAccount && !email) return NextResponse.json({ error: "Email cannot be removed while the patient portal is active." }, { status: 400 });

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (patient.portalAccount) await tx.patientPortalAccount.update({ where: { patientId: params.id }, data: { email } });
      return tx.patient.update({
        where: { id: params.id },
        data: {
          name, age, gender: gender as any, email: email || null,
          dateOfBirth,
          phone: String(body.phone || "").trim() || null,
          bloodGroup: String(body.bloodGroup || "").trim() || null,
          address: String(body.address || "").trim() || null,
          emergencyContact: String(body.emergencyContact || "").trim() || null,
        },
        include: { allergies: true, visits: { select: { id: true, status: true } } },
      });
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "That email is already used by another portal account." }, { status: 409 });
    }
    throw error;
  }
}

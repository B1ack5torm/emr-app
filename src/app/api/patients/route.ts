import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";

export async function GET(req: NextRequest) {
  const access = await requirePermission("patient:read");
  if (access.response) return access.response;
  const session = { user: access.user } as any;
  const organizationId = (session.user as any).organizationId;
  const isSuperAdmin = (session.user as any).role === "SUPER_ADMIN";

  const q = req.nextUrl.searchParams.get("q") || "";

  const patients = await prisma.patient.findMany({
    where: { ...(isSuperAdmin ? {} : { organizationId }), ...(q ? { OR: [{ mrn: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}) },
    include: { allergies: true, visits: { select: { id: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(patients);
}

export async function POST(req: NextRequest) {
  const access = await requirePermission("patient:create");
  if (access.response) return access.response;
  const session = { user: access.user } as any;
  const organizationId = (session.user as any).organizationId;

  const body = await req.json();
  const { name, age, gender, phone, email, address, bloodGroup, emergencyContact, dateOfBirth, allergies } = body;

  if (!name || !age || !["MALE", "FEMALE", "OTHER"].includes(gender)) return NextResponse.json({ error: "name, age and a valid gender are required" }, { status: 400 });

  const existingPatients = await prisma.patient.count({ where: { organizationId } });
  let patient;

  for (let number = existingPatients + 1; number <= existingPatients + 100; number++) {
    const mrn = `MRN-${String(number).padStart(6, "0")}`;
    try {
      patient = await prisma.patient.create({
        data: {
          mrn, name, age: Number(age), gender, phone, email: email?.trim() || null, address, bloodGroup, emergencyContact, organizationId, createdById: (session.user as any).id, updatedById: (session.user as any).id,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          allergies: { create: (allergies || []).map((a: string) => ({ name: a })) }
        },
        include: { allergies: true },
      });
      break;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    }
  }

  if (!patient) return NextResponse.json({ error: "Could not assign a unique MRN. Please try again." }, { status: 503 });
  await audit({ organizationId, userId: (session.user as any).id, patientId: patient.id, action: "PATIENT_CREATED", resourceType: "Patient", resourceId: patient.id, newValue: { mrn: patient.mrn }, request: req });

  return NextResponse.json(patient, { status: 201 });
}

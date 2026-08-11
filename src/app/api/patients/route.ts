import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const organizationId = (session.user as any).organizationId;

  const q = req.nextUrl.searchParams.get("q") || "";

  const patients = await prisma.patient.findMany({
    where: { organizationId, ...(q ? { OR: [{ mrn: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}) },
    include: { allergies: true, visits: { select: { id: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(patients);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["RECEPTION", "ADMIN"].includes((session.user as any).role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const organizationId = (session.user as any).organizationId;

  const body = await req.json();
  const { name, age, gender, phone, address, bloodGroup, emergencyContact, dateOfBirth, allergies } = body;

  if (!name || !age || !gender) return NextResponse.json({ error: "name, age and gender are required" }, { status: 400 });

  const existingPatients = await prisma.patient.count({ where: { organizationId } });
  let patient;

  for (let number = existingPatients + 1; number <= existingPatients + 100; number++) {
    const mrn = `MRN-${String(number).padStart(6, "0")}`;
    try {
      patient = await prisma.patient.create({
        data: {
          mrn, name, age: Number(age), gender, phone, address, bloodGroup, emergencyContact, organizationId,
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

  return NextResponse.json(patient, { status: 201 });
}

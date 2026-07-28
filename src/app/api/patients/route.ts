import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/patients?q=search
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q") || "";

  const patients = await prisma.patient.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        }
      : undefined,
    include: { allergies: true, visits: { select: { id: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(patients);
}

// POST /api/patients  { name, age, gender, phone, address, bloodGroup, emergencyContact, allergies: string[] }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["RECEPTION", "ADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, age, gender, phone, address, bloodGroup, emergencyContact, allergies } = body;

  if (!name || !age || !gender) {
    return NextResponse.json({ error: "name, age and gender are required" }, { status: 400 });
  }

  const patient = await prisma.patient.create({
    data: {
      name,
      age: Number(age),
      gender,
      phone,
      address,
      bloodGroup,
      emergencyContact,
      allergies: {
        create: (allergies || []).map((a: string) => ({ name: a })),
      },
    },
    include: { allergies: true },
  });

  return NextResponse.json(patient, { status: 201 });
}

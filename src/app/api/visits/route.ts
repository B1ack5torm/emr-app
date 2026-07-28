import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/visits?status=WAITING
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status");

  const visits = await prisma.visit.findMany({
    where: status ? { status: status as any } : undefined,
    include: { patient: { include: { allergies: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(visits);
}

// POST /api/visits  { patientId, chiefComplaint, bp, temperature, pulse, weight }
// Logged by front desk when a patient arrives — puts them in the doctor's queue.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["RECEPTION", "ADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { patientId, chiefComplaint, bp, temperature, pulse, weight } = body;

  if (!patientId) {
    return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  }

  const visit = await prisma.visit.create({
    data: { patientId, chiefComplaint, bp, temperature, pulse, weight, status: "WAITING" },
  });

  return NextResponse.json(visit, { status: 201 });
}

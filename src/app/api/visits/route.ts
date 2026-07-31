import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const organizationId = (session.user as any).organizationId;

  const status = req.nextUrl.searchParams.get("status");

  const visits = await prisma.visit.findMany({
    where: { patient: { organizationId }, ...(status ? { status: status as any } : {}) },
    include: { patient: { include: { allergies: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(visits);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["RECEPTION", "ADMIN"].includes((session.user as any).role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const organizationId = (session.user as any).organizationId;

  const body = await req.json();
  const { patientId, chiefComplaint, bp, temperature, pulse, weight } = body;
  if (!patientId) return NextResponse.json({ error: "patientId is required" }, { status: 400 });

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient || patient.organizationId !== organizationId) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const visit = await prisma.visit.create({ data: { patientId, chiefComplaint, bp, temperature, pulse, weight, status: "WAITING" } });
  return NextResponse.json(visit, { status: 201 });
}
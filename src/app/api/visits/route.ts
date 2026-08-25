import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";

export async function GET(req: NextRequest) {
  const access = await requirePermission("encounter:create");
  if (access.response) return access.response;
  const session = { user: access.user } as any;
  const organizationId = (session.user as any).organizationId;

  const status = req.nextUrl.searchParams.get("status");

  const doctorId = (session.user as any).role === "DOCTOR" ? (session.user as any).id : undefined;
  const visits = await prisma.visit.findMany({
    where: { patient: { organizationId }, ...(doctorId ? { doctorId } : {}), ...(status ? { status: status as any } : {}) },
    include: { patient: { include: { allergies: true } }, invoice: { select: { id: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(visits);
}

export async function POST(req: NextRequest) {
  const access = await requirePermission("encounter:create");
  if (access.response) return access.response;
  const session = { user: access.user } as any;
  const organizationId = (session.user as any).organizationId;

  const body = await req.json();
  const { patientId, doctorId, chiefComplaint, bp, temperature, pulse, weight } = body;
  if (!patientId || !doctorId) return NextResponse.json({ error: "patientId and doctorId are required" }, { status: 400 });

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient || patient.organizationId !== organizationId) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const doctor = await prisma.user.findFirst({ where: { id: doctorId, organizationId, role: "DOCTOR", status: "ACTIVE" }, select: { id: true } });
  if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });

  const visit = await prisma.visit.create({ data: { patientId, doctorId, chiefComplaint, bp, temperature, pulse, weight, status: "WAITING" } });
  await audit({ organizationId, userId: (session.user as any).id, patientId, action: "ENCOUNTER_CREATED", resourceType: "Visit", resourceId: visit.id, request: req });
  return NextResponse.json(visit, { status: 201 });
}

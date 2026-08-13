import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const organizationId = (session.user as any).organizationId;
  const isSuperAdmin = (session.user as any).role === "SUPER_ADMIN";

  const status = req.nextUrl.searchParams.get("status");

  const doctorId = (session.user as any).role === "DOCTOR" ? (session.user as any).id : undefined;
  const visits = await prisma.visit.findMany({
    where: { patient: isSuperAdmin ? {} : { organizationId }, ...(doctorId ? { doctorId } : {}), ...(status ? { status: status as any } : {}) },
    include: { patient: { include: { allergies: true } }, invoice: { select: { id: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(visits);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["RECEPTION", "ADMIN", "SUPER_ADMIN"].includes((session.user as any).role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const organizationId = (session.user as any).organizationId;

  const body = await req.json();
  const { patientId, doctorId, chiefComplaint, bp, temperature, pulse, weight } = body;
  if (!patientId || !doctorId) return NextResponse.json({ error: "patientId and doctorId are required" }, { status: 400 });

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient || patient.organizationId !== organizationId) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const doctor = await prisma.user.findFirst({ where: { id: doctorId, organizationId, role: "DOCTOR", status: "ACTIVE" }, select: { id: true } });
  if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });

  const visit = await prisma.visit.create({ data: { patientId, doctorId, chiefComplaint, bp, temperature, pulse, weight, status: "WAITING" } });
  return NextResponse.json(visit, { status: 201 });
}

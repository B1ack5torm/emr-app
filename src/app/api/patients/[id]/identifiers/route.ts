import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";

const allowedUses = ["USUAL", "OFFICIAL", "TEMP", "SECONDARY", "OLD"];

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requirePermission("patient:read");
  if (access.response) return access.response;
  const patient = await prisma.patient.findFirst({ where: { id: params.id, organizationId: access.user.organizationId }, select: { id: true } });
  if (!patient) return NextResponse.json({ error: "Patient not found." }, { status: 404 });
  return NextResponse.json(await prisma.patientIdentifier.findMany({ where: { patientId: patient.id }, orderBy: [{ active: "desc" }, { createdAt: "asc" }] }));
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requirePermission("patient:update");
  if (access.response) return access.response;
  const organizationId = access.user.organizationId;
  const patient = await prisma.patient.findFirst({ where: { id: params.id, organizationId, active: true, mergedIntoId: null }, select: { id: true } });
  if (!patient) return NextResponse.json({ error: "Active patient not found." }, { status: 404 });
  const body = await request.json();
  const type = String(body.type || "").trim().slice(0, 100), system = String(body.system || "").trim().slice(0, 500), value = String(body.value || "").trim().slice(0, 500), use = String(body.use || "USUAL");
  if (!type || !system || !value || !allowedUses.includes(use)) return NextResponse.json({ error: "Identifier type, system, value, and valid use are required." }, { status: 400 });
  try {
    const identifier = await prisma.patientIdentifier.create({ data: { organizationId, patientId: patient.id, type, system, value, use: use as any, verifiedAt: body.verified ? new Date() : null } });
    await audit({ organizationId, userId: access.user.id, patientId: patient.id, action: "PATIENT_IDENTIFIER_ADDED", resourceType: "PatientIdentifier", resourceId: identifier.id, newValue: { type, system, value }, request });
    return NextResponse.json(identifier, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "That identifier is already assigned to another patient." }, { status: 409 });
    throw error;
  }
}

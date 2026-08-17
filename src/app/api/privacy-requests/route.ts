import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";

export async function GET() {
  const access = await requirePermission("audit:read");
  if (access.response) return access.response;
  const requests = await prisma.privacyRequest.findMany({ where: { organizationId: access.user.organizationId }, include: { patient: { select: { id: true, name: true, mrn: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json(requests);
}

export async function POST(request: NextRequest) {
  const access = await requirePermission("patient:read");
  if (access.response) return access.response;
  const body = await request.json();
  if (!body.patientId || !["ACCESS", "CORRECTION", "EXPORT", "ERASURE", "GRIEVANCE"].includes(body.type)) return NextResponse.json({ error: "A patient and valid request type are required." }, { status: 400 });
  const patient = await prisma.patient.findFirst({ where: { id: body.patientId, organizationId: access.user.organizationId }, select: { id: true } });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  const privacyRequest = await prisma.privacyRequest.create({ data: { organizationId: access.user.organizationId, patientId: patient.id, type: body.type, details: body.details ? String(body.details).slice(0, 2000) : null } });
  await audit({ organizationId: access.user.organizationId, userId: access.user.id, patientId: patient.id, action: "PRIVACY_REQUEST_RECEIVED", resourceType: "PrivacyRequest", resourceId: privacyRequest.id, request });
  return NextResponse.json(privacyRequest, { status: 201 });
}

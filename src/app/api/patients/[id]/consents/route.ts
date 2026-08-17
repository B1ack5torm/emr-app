import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requirePermission("patient:read");
  if (access.response) return access.response;
  const consent = await prisma.consent.findMany({ where: { patientId: params.id, organizationId: access.user.organizationId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(consent);
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requirePermission("patient:update");
  if (access.response) return access.response;
  const patient = await prisma.patient.findFirst({ where: { id: params.id, organizationId: access.user.organizationId }, select: { id: true } });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  const body = await request.json();
  if (!body.consentType || !body.privacyNoticeVersion || !body.purpose || !["PENDING", "GRANTED", "WITHDRAWN", "EXPIRED"].includes(body.status || "PENDING")) return NextResponse.json({ error: "Consent type, notice version, purpose, and valid status are required." }, { status: 400 });
  const status = body.status || "PENDING";
  const consent = await prisma.consent.create({ data: { organizationId: access.user.organizationId, patientId: patient.id, consentType: String(body.consentType).slice(0, 100), privacyNoticeVersion: String(body.privacyNoticeVersion).slice(0, 100), purpose: String(body.purpose).slice(0, 500), status, capturedAt: status === "GRANTED" ? new Date() : null, captureMethod: body.captureMethod ? String(body.captureMethod).slice(0, 100) : null, capturedById: access.user.id, guardianName: body.guardianName ? String(body.guardianName).slice(0, 200) : null } });
  await audit({ organizationId: access.user.organizationId, userId: access.user.id, patientId: patient.id, action: status === "WITHDRAWN" ? "CONSENT_WITHDRAWN" : "CONSENT_RECORDED", resourceType: "Consent", resourceId: consent.id, request });
  return NextResponse.json(consent, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";

export async function PATCH(req: NextRequest, { params }: { params: { id: string; kind: string; entryId: string } }) {
  const access = await requirePermission("encounter:create");
  if (access.response) return access.response;
  const user = access.user as any;
  const patient = await prisma.patient.findUnique({ where: { id: params.id }, select: { organizationId: true, active: true, mergedIntoId: true } });
  if (!patient || !patient.active || patient.mergedIntoId || patient.organizationId !== user.organizationId) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const kind = params.kind.toUpperCase();
  let updated: any;
  if (kind === "ALLERGY") {
    const current = await prisma.allergy.findFirst({ where: { id: params.entryId, patientId: params.id } }); if (!current) return notFound();
    const clinicalStatus = allowed(body.clinicalStatus, ["ACTIVE", "INACTIVE", "RESOLVED", "ENTERED_IN_ERROR"]); if (!clinicalStatus) return invalidStatus();
    updated = await prisma.allergy.update({ where: { id: current.id }, data: { clinicalStatus } as any });
  } else if (kind === "PROBLEM") {
    const current = await prisma.clinicalProblem.findFirst({ where: { id: params.entryId, patientId: params.id, organizationId: patient.organizationId } }); if (!current) return notFound();
    const clinicalStatus = allowed(body.clinicalStatus, ["ACTIVE", "INACTIVE", "RESOLVED", "REMISSION", "RECURRENCE", "ENTERED_IN_ERROR"]); if (!clinicalStatus) return invalidStatus();
    updated = await prisma.clinicalProblem.update({ where: { id: current.id }, data: { clinicalStatus, resolvedDate: clinicalStatus === "RESOLVED" ? new Date() : null } as any });
  } else if (kind === "MEDICATION") {
    const current = await prisma.medicationStatement.findFirst({ where: { id: params.entryId, patientId: params.id, organizationId: patient.organizationId } }); if (!current) return notFound();
    const status = allowed(body.status, ["ACTIVE", "COMPLETED", "ENTERED_IN_ERROR", "INTENDED", "STOPPED", "ON_HOLD", "UNKNOWN"]); if (!status) return invalidStatus();
    updated = await prisma.medicationStatement.update({ where: { id: current.id }, data: { status, effectiveTo: ["COMPLETED", "STOPPED"].includes(status) ? new Date() : null } as any });
  } else if (kind === "FLAG") {
    const current = await prisma.clinicalFlag.findFirst({ where: { id: params.entryId, patientId: params.id, organizationId: patient.organizationId } }); if (!current) return notFound();
    if (typeof body.active !== "boolean") return NextResponse.json({ error: "Flag active status is required." }, { status: 400 });
    updated = await prisma.clinicalFlag.update({ where: { id: current.id }, data: { active: body.active, endsAt: body.active ? null : new Date() } });
  } else return NextResponse.json({ error: "Unsupported clinical summary item." }, { status: 400 });
  await audit({ organizationId: patient.organizationId, userId: user.id, patientId: params.id, action: `${kind}_STATUS_CHANGED`, resourceType: kind, resourceId: params.entryId, newValue: body, request: req });
  return NextResponse.json(updated);
}

function allowed(value: unknown, values: string[]) { const candidate = String(value || ""); return values.includes(candidate) ? candidate : null; }
function notFound() { return NextResponse.json({ error: "Clinical item not found." }, { status: 404 }); }
function invalidStatus() { return NextResponse.json({ error: "A valid status is required." }, { status: 400 }); }

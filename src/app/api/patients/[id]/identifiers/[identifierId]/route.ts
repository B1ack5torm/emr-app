import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";

export async function DELETE(request: NextRequest, { params }: { params: { id: string; identifierId: string } }) {
  const access = await requirePermission("patient:update");
  if (access.response) return access.response;
  const identifier = await prisma.patientIdentifier.findFirst({ where: { id: params.identifierId, patientId: params.id, organizationId: access.user.organizationId } });
  if (!identifier) return NextResponse.json({ error: "Identifier not found." }, { status: 404 });
  if (identifier.type === "MRN" && identifier.system === "urn:carechart:mrn") return NextResponse.json({ error: "The primary MRN cannot be removed." }, { status: 409 });
  const updated = await prisma.patientIdentifier.update({ where: { id: identifier.id }, data: { active: false, use: "OLD" } });
  await audit({ organizationId: access.user.organizationId, userId: access.user.id, patientId: params.id, action: "PATIENT_IDENTIFIER_RETIRED", resourceType: "PatientIdentifier", resourceId: identifier.id, previousValue: { active: true }, newValue: { active: false }, request });
  return NextResponse.json(updated);
}

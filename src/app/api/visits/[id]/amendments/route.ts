import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";

const amendable = ["diagnosis", "doctorNotes", "advice", "assessment", "treatmentPlan", "followUpDate", "referralNotes"] as const;

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requirePermission("encounter:finalize");
  if (access.response) return access.response;
  const user = access.user as any;
  const encounter = await prisma.visit.findFirst({ where: { id: params.id, patient: { organizationId: user.organizationId } } });
  if (!encounter) return NextResponse.json({ error: "Encounter not found." }, { status: 404 });
  if (!encounter.signedAt) return NextResponse.json({ error: "Only finalized encounters can be amended." }, { status: 409 });
  const body = await request.json();
  const reason = String(body.reason || "").trim();
  if (reason.length < 5) return NextResponse.json({ error: "Provide an amendment reason of at least five characters." }, { status: 400 });
  const changes: Record<string, string | Date | null> = {};
  for (const field of amendable) {
    if (!(field in (body.changes || {}))) continue;
    if (field === "followUpDate") changes[field] = body.changes[field] ? new Date(body.changes[field]) : null;
    else changes[field] = String(body.changes[field] || "").trim().slice(0, 10_000) || null;
  }
  if (!Object.keys(changes).length) return NextResponse.json({ error: "Provide at least one supported correction." }, { status: 400 });
  const originalContent = Object.fromEntries(Object.keys(changes).map((field) => [field, (encounter as any)[field] ?? null]));
  const result = await prisma.$transaction(async (tx) => {
    const amendment = await tx.encounterAmendment.create({ data: { visitId: encounter.id, authorId: user.id, reason: reason.slice(0, 2000), originalContent, amendedContent: changes as any } });
    const updated = await tx.visit.update({ where: { id: encounter.id }, data: { ...changes, status: "AMENDED", version: { increment: 1 } } });
    return { amendment, encounter: updated };
  });
  await audit({ organizationId: user.organizationId, userId: user.id, patientId: encounter.patientId, action: "ENCOUNTER_AMENDED", resourceType: "Visit", resourceId: encounter.id, reason, newValue: { amendmentId: result.amendment.id, fields: Object.keys(changes) }, request });
  return NextResponse.json(result, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requirePermission("patient:read");
  if (access.response) return access.response;
  const user = access.user as any;
  const patient = await prisma.patient.findUnique({
    where: { id: params.id },
    include: {
      identifiers: { where: { active: true }, orderBy: { createdAt: "asc" } },
      allergies: { orderBy: [{ clinicalStatus: "asc" }, { createdAt: "desc" }] },
      problems: { orderBy: [{ clinicalStatus: "asc" }, { createdAt: "desc" }] },
      medicationStatements: { orderBy: [{ status: "asc" }, { createdAt: "desc" }] },
      immunizations: { orderBy: { occurrenceDate: "desc" } },
      procedures: { orderBy: { performedAt: "desc" } },
      clinicalFlags: { orderBy: [{ active: "desc" }, { severity: "desc" }, { createdAt: "desc" }] },
      diagnosticObservations: { orderBy: { observedAt: "desc" }, take: 100, include: { order: { select: { id: true, orderNumber: true, procedureName: true } } } },
      visits: { orderBy: { createdAt: "desc" }, take: 25, include: { prescriptions: true, testsOrdered: true, doctor: { select: { name: true } }, vitals: { orderBy: { measuredAt: "desc" }, take: 1 }, diagnoses: true } },
      sourceMergeRecords: { orderBy: { createdAt: "desc" }, select: { id: true, sourcePatientId: true, reason: true, createdAt: true } },
    },
  });
  if (!patient || !patient.active || patient.mergedIntoId || (user.role !== "SUPER_ADMIN" && patient.organizationId !== user.organizationId)) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  await audit({ organizationId: patient.organizationId, userId: user.id, patientId: patient.id, action: "CLINICAL_SUMMARY_VIEWED", resourceType: "Patient", resourceId: patient.id, request: req });
  return NextResponse.json(patient);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requirePermission("encounter:create");
  if (access.response) return access.response;
  const user = access.user as any;
  const patient = await prisma.patient.findUnique({ where: { id: params.id }, select: { id: true, organizationId: true, active: true, mergedIntoId: true } });
  if (!patient || !patient.active || patient.mergedIntoId || (user.role !== "SUPER_ADMIN" && patient.organizationId !== user.organizationId)) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const kind = String(body.kind || "").toUpperCase();
  let created: any;

  if (kind === "ALLERGY") {
    const name = requiredText(body.name, "Allergen"); if (name.error) return name.error;
    created = await prisma.allergy.create({ data: { patientId: patient.id, name: name.value!, code: optional(body.code), codingSystem: optional(body.codingSystem), category: optional(body.category), reaction: optional(body.reaction), severity: oneOf(body.severity, ["MILD", "MODERATE", "SEVERE", "LIFE_THREATENING", "UNKNOWN"], "UNKNOWN") as any, verificationStatus: oneOf(body.verificationStatus, ["UNCONFIRMED", "PROVISIONAL", "DIFFERENTIAL", "CONFIRMED", "REFUTED", "ENTERED_IN_ERROR"], "UNCONFIRMED") as any, onsetDate: validDate(body.onsetDate), notes: optional(body.notes), recordedById: user.id } });
  } else if (kind === "PROBLEM") {
    const description = requiredText(body.description, "Problem"); if (description.error) return description.error;
    created = await prisma.clinicalProblem.create({ data: { organizationId: patient.organizationId, patientId: patient.id, description: description.value!, code: optional(body.code), codingSystem: optional(body.codingSystem), verificationStatus: oneOf(body.verificationStatus, ["UNCONFIRMED", "PROVISIONAL", "DIFFERENTIAL", "CONFIRMED", "REFUTED", "ENTERED_IN_ERROR"], "CONFIRMED") as any, onsetDate: validDate(body.onsetDate), notes: optional(body.notes), recordedById: user.id } });
  } else if (kind === "MEDICATION") {
    const medication = requiredText(body.medication, "Medication"); if (medication.error) return medication.error;
    created = await prisma.medicationStatement.create({ data: { organizationId: patient.organizationId, patientId: patient.id, medication: medication.value!, medicationCode: optional(body.medicationCode), codingSystem: optional(body.codingSystem), dose: optional(body.dose), dosageUnit: optional(body.dosageUnit), route: optional(body.route), frequency: optional(body.frequency), reason: optional(body.reason), effectiveFrom: validDate(body.effectiveFrom), source: optional(body.source) || "CLINICIAN_REPORTED", notes: optional(body.notes), recordedById: user.id } });
  } else if (kind === "IMMUNIZATION") {
    const vaccine = requiredText(body.vaccine, "Vaccine"); if (vaccine.error) return vaccine.error;
    const occurrenceDate = validDate(body.occurrenceDate); if (!occurrenceDate) return NextResponse.json({ error: "A valid immunization date is required." }, { status: 400 });
    created = await prisma.immunizationRecord.create({ data: { organizationId: patient.organizationId, patientId: patient.id, vaccine: vaccine.value!, vaccineCode: optional(body.vaccineCode), codingSystem: optional(body.codingSystem), occurrenceDate, lotNumber: optional(body.lotNumber), manufacturer: optional(body.manufacturer), site: optional(body.site), route: optional(body.route), doseQuantity: optional(body.doseQuantity), performer: optional(body.performer), notes: optional(body.notes), recordedById: user.id } });
  } else if (kind === "PROCEDURE") {
    const description = requiredText(body.description, "Procedure"); if (description.error) return description.error;
    created = await prisma.patientProcedure.create({ data: { organizationId: patient.organizationId, patientId: patient.id, description: description.value!, code: optional(body.code), codingSystem: optional(body.codingSystem), performedAt: validDate(body.performedAt), performer: optional(body.performer), bodySite: optional(body.bodySite), outcome: optional(body.outcome), notes: optional(body.notes), recordedById: user.id } });
  } else if (kind === "FLAG") {
    const title = requiredText(body.title, "Flag title"); if (title.error) return title.error;
    created = await prisma.clinicalFlag.create({ data: { organizationId: patient.organizationId, patientId: patient.id, category: optional(body.category) || "CLINICAL", title: title.value!, description: optional(body.description), severity: oneOf(body.severity, ["MILD", "MODERATE", "SEVERE", "LIFE_THREATENING", "UNKNOWN"], "UNKNOWN") as any, endsAt: validDate(body.endsAt), recordedById: user.id } });
  } else return NextResponse.json({ error: "Unsupported clinical summary item." }, { status: 400 });

  await audit({ organizationId: patient.organizationId, userId: user.id, patientId: patient.id, action: `${kind}_RECORDED`, resourceType: kind, resourceId: created.id, request: req });
  return NextResponse.json(created, { status: 201 });
}

function optional(value: unknown) { const text = String(value || "").trim(); return text ? text.slice(0, 2000) : null; }
function validDate(value: unknown) { if (!value) return null; const date = new Date(String(value)); return Number.isNaN(date.getTime()) ? null : date; }
function oneOf(value: unknown, values: string[], fallback: string) { const candidate = String(value || fallback); return values.includes(candidate) ? candidate : fallback; }
function requiredText(value: unknown, label: string): { value?: string; error?: NextResponse } { const text = optional(value); return text ? { value: text } : { error: NextResponse.json({ error: `${label} is required.` }, { status: 400 }) }; }

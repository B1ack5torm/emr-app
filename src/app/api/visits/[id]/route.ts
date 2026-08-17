import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";
import { calculateBmi, medicationMatchesAllergy, validateVitalRange } from "@/lib/domain/clinical";

const optionalText = (value: unknown, max = 10_000) => typeof value === "string" ? value.trim().slice(0, max) || null : undefined;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requirePermission("patient:read");
  if (access.response) return access.response;
  const user = access.user as any;
  const visit = await prisma.visit.findFirst({
    where: { id: params.id, patient: { organizationId: user.organizationId } },
    include: {
      patient: { include: { allergies: true } }, prescriptions: true, testsOrdered: true,
      diagnoses: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] }, vitals: { orderBy: { measuredAt: "desc" } },
      amendments: { orderBy: { createdAt: "desc" } }, doctor: { select: { name: true } },
    },
  });
  if (!visit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(visit);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requirePermission("encounter:finalize");
  if (access.response) return access.response;
  const user = access.user as any;
  const existing = await prisma.visit.findFirst({ where: { id: params.id, patient: { organizationId: user.organizationId } }, include: { patient: { include: { allergies: true } } } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.signedAt) return NextResponse.json({ error: "Finalized encounters are immutable. Create an amendment instead." }, { status: 409 });

  const body = await req.json();
  if (body.version != null && body.version !== existing.version) return NextResponse.json({ error: "This encounter changed. Refresh and try again." }, { status: 409 });
  const prescriptions = Array.isArray(body.prescriptions) ? body.prescriptions.filter((item: any) => item?.medicine?.trim()) : [];
  const allergyNames = existing.patient.allergies.map((item) => item.name);
  const unacknowledged = prescriptions.find((item: any) => medicationMatchesAllergy(String(item.medicine), allergyNames) && !item.allergyWarningAcknowledged);
  if (unacknowledged) return NextResponse.json({ error: `Acknowledge the allergy warning for ${unacknowledged.medicine} before saving.` }, { status: 409 });

  const vital = body.vital && typeof body.vital === "object" ? {
    heightCm: body.vital.heightCm == null ? undefined : Number(body.vital.heightCm), weightKg: body.vital.weightKg == null ? undefined : Number(body.vital.weightKg),
    temperatureC: body.vital.temperatureC == null ? undefined : Number(body.vital.temperatureC), pulseBpm: body.vital.pulseBpm == null ? undefined : Number(body.vital.pulseBpm),
    respiratoryRate: body.vital.respiratoryRate == null ? undefined : Number(body.vital.respiratoryRate), systolicBp: body.vital.systolicBp == null ? undefined : Number(body.vital.systolicBp),
    diastolicBp: body.vital.diastolicBp == null ? undefined : Number(body.vital.diastolicBp), oxygenSaturation: body.vital.oxygenSaturation == null ? undefined : Number(body.vital.oxygenSaturation),
  } : null;
  if (vital) { const rangeError = validateVitalRange(vital); if (rangeError) return NextResponse.json({ error: rangeError }, { status: 400 }); }
  const diagnoses = Array.isArray(body.diagnoses) ? body.diagnoses.filter((item: any) => item?.description?.trim()) : body.diagnosis?.trim() ? [{ description: body.diagnosis, isPrimary: true }] : [];
  const complete = !!body.complete;
  const finalizedAt = complete ? new Date() : null;

  const visit = await prisma.$transaction(async (tx) => {
    await tx.prescription.deleteMany({ where: { visitId: params.id } });
    await tx.testOrder.deleteMany({ where: { visitId: params.id } });
    await tx.diagnosisEntry.deleteMany({ where: { visitId: params.id } });
    return tx.visit.update({
      where: { id: params.id },
      data: {
        diagnosis: optionalText(body.diagnosis), doctorNotes: optionalText(body.doctorNotes), advice: optionalText(body.advice), doctorId: user.id,
        reasonForVisit: optionalText(body.reasonForVisit), historyOfPresentIllness: optionalText(body.historyOfPresentIllness), pastMedicalHistory: optionalText(body.pastMedicalHistory),
        surgicalHistory: optionalText(body.surgicalHistory), familyHistory: optionalText(body.familyHistory), socialHistory: optionalText(body.socialHistory), reviewOfSystems: optionalText(body.reviewOfSystems),
        examination: optionalText(body.examination), assessment: optionalText(body.assessment), treatmentPlan: optionalText(body.treatmentPlan), referralNotes: optionalText(body.referralNotes), privateNote: optionalText(body.privateNote),
        followUpDate: body.followUpDate ? new Date(body.followUpDate) : undefined, status: complete ? "COMPLETED" : "WAITING", signedAt: finalizedAt, version: { increment: 1 },
        prescriptions: { create: prescriptions.map((item: any, index: number) => ({ medicine: String(item.medicine).trim().slice(0, 500), genericName: optionalText(item.genericName, 500), strength: optionalText(item.strength, 100), dose: optionalText(item.dose, 100), dosage: optionalText(item.dosage, 200), dosageUnit: optionalText(item.dosageUnit, 100), route: optionalText(item.route, 100), frequency: optionalText(item.frequency, 200), duration: optionalText(item.duration, 200), quantity: item.quantity == null ? null : Math.max(1, Math.round(Number(item.quantity))), foodInstruction: optionalText(item.foodInstruction, 200), startDate: item.startDate ? new Date(item.startDate) : null, directions: optionalText(item.directions, 2000), allergyWarningAcknowledged: !!item.allergyWarningAcknowledged, finalizedAt, reference: complete ? `RX-${params.id.slice(-8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${index + 1}` : null })) },
        testsOrdered: { create: (Array.isArray(body.testsOrdered) ? body.testsOrdered : []).filter((name: unknown) => typeof name === "string" && name.trim()).map((name: string) => ({ name: name.trim().slice(0, 500) })) },
        diagnoses: { create: diagnoses.map((item: any, index: number) => ({ code: optionalText(item.code, 100), codingSystem: optionalText(item.codingSystem, 100), description: String(item.description).trim().slice(0, 1000), isPrimary: item.isPrimary ?? index === 0, clinicalStatus: optionalText(item.clinicalStatus, 100) })) },
        ...(vital ? { vitals: { create: { ...vital, bmi: calculateBmi(vital.heightCm, vital.weightKg), bmiCalculatedAt: vital.heightCm && vital.weightKg ? new Date() : null, recordedById: user.id } } } : {}),
      },
      include: { prescriptions: true, testsOrdered: true, diagnoses: true, vitals: { orderBy: { measuredAt: "desc" } }, doctor: { select: { name: true } } },
    });
  });
  await audit({ organizationId: user.organizationId, userId: user.id, patientId: existing.patientId, action: complete ? "ENCOUNTER_FINALIZED" : "ENCOUNTER_UPDATED", resourceType: "Visit", resourceId: visit.id, newValue: { status: visit.status, version: visit.version }, request: req });
  return NextResponse.json(visit);
}

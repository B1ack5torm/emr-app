import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";

const documentFields = { id: true, originalName: true } satisfies Prisma.StoredDocumentSelect;

function historyFields(organizationId: string, patientId: string) {
  const documentScope = { organizationId, patientId, deletedAt: null };

  return {
    id: true,
    status: true,
    createdAt: true,
    signedAt: true,
    doctor: { select: { name: true } },
    chiefComplaint: true,
    reasonForVisit: true,
    historyOfPresentIllness: true,
    pastMedicalHistory: true,
    surgicalHistory: true,
    familyHistory: true,
    socialHistory: true,
    reviewOfSystems: true,
    examination: true,
    doctorNotes: true,
    diagnosis: true,
    assessment: true,
    treatmentPlan: true,
    advice: true,
    followUpDate: true,
    referralNotes: true,
    privateNote: true,
    bp: true,
    temperature: true,
    pulse: true,
    weight: true,
    vitals: {
      orderBy: { measuredAt: "desc" },
      select: {
        id: true, measuredAt: true, systolicBp: true, diastolicBp: true, temperatureC: true,
        pulseBpm: true, respiratoryRate: true, oxygenSaturation: true, heightCm: true, weightKg: true, bmi: true,
      },
    },
    diagnoses: {
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      select: { id: true, description: true, code: true, codingSystem: true, isPrimary: true, clinicalStatus: true },
    },
    prescriptions: {
      select: {
        id: true, medicine: true, genericName: true, strength: true, dosage: true, dose: true, dosageUnit: true,
        route: true, frequency: true, duration: true, quantity: true, foodInstruction: true, startDate: true,
        directions: true, status: true, reference: true, interactionOverrideReason: true,
      },
    },
    testsOrdered: { select: { id: true, name: true } },
    imagingRecommendations: { select: { id: true, name: true, code: true, modality: true, bodyPart: true, description: true } },
    imagingOrders: {
      orderBy: { createdAt: "desc" },
      select: { id: true, accessionNumber: true, procedureDescription: true, procedureCode: true, modality: true, bodyPart: true, clinicalIndication: true, status: true },
    },
    diagnosticOrders: {
      where: { organizationId, patientId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, orderNumber: true, type: true, procedureName: true, status: true, clinicalIndication: true, resultSummary: true,
        observations: {
          where: { organizationId, patientId },
          orderBy: { createdAt: "asc" },
          select: {
            id: true, display: true, valueNumber: true, valueText: true, valueBoolean: true, unit: true,
            referenceText: true, referenceLow: true, referenceHigh: true, status: true, interpretation: true, isCritical: true,
          },
        },
        documents: { where: documentScope, select: documentFields, orderBy: { createdAt: "desc" } },
      },
    },
    documents: {
      where: { ...documentScope, diagnosticOrderId: null },
      select: documentFields,
      orderBy: { createdAt: "desc" },
    },
    amendments: { orderBy: { createdAt: "desc" }, select: { id: true, createdAt: true, reason: true } },
  } satisfies Prisma.VisitSelect;
}

type JsonDates<T> = T extends Date ? string : T extends object ? { [K in keyof T]: JsonDates<T[K]> } : T;
export type HistoryVisit = JsonDates<Prisma.VisitGetPayload<{ select: ReturnType<typeof historyFields> }>>;

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requirePermission("encounter:finalize");
  if (access.response) return access.response;

  const { id: userId, organizationId } = access.user;
  const currentVisit = await prisma.visit.findFirst({
    where: { id: params.id, patient: { organizationId } },
    select: { patientId: true, createdAt: true },
  });
  if (!currentVisit) return NextResponse.json({ error: "Visit not found." }, { status: 404 });

  const { patientId, createdAt } = currentVisit;
  const visits = await prisma.visit.findMany({
    where: {
      patientId,
      patient: { organizationId },
      id: { not: params.id },
      createdAt: { lte: createdAt },
      status: { in: ["COMPLETED", "FINALIZED", "AMENDED"] },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: historyFields(organizationId, patientId),
  });

  await audit({ organizationId, userId, patientId, action: "PATIENT_VIEWED", resourceType: "Patient", resourceId: patientId, request });
  return NextResponse.json(visits, { headers: { "Cache-Control": "private, no-store" } });
}

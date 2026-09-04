import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPatientSession } from "@/lib/patient-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getPatientSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const patient = await prisma.patient.findUnique({
    where: { id: session.account.patientId },
    select: {
      id: true, mrn: true, name: true, age: true, dateOfBirth: true, gender: true, phone: true, email: true,
      address: true, bloodGroup: true, emergencyContact: true, createdAt: true,
      organization: { select: { name: true } },
      allergies: { where: { clinicalStatus: "ACTIVE" }, select: { id: true, name: true, reaction: true, severity: true } },
      problems: { where: { clinicalStatus: "ACTIVE" }, orderBy: { createdAt: "desc" }, select: { id: true, description: true, onsetDate: true } },
      medicationStatements: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, select: { id: true, medication: true, dose: true, dosageUnit: true, frequency: true, route: true } },
      immunizations: { where: { status: "COMPLETED" }, orderBy: { occurrenceDate: "desc" }, select: { id: true, vaccine: true, occurrenceDate: true } },
      diagnosticObservations: { where: { reviewedAt: { not: null }, status: { in: ["FINAL", "AMENDED", "CORRECTED"] } }, orderBy: { observedAt: "desc" }, take: 50, select: { id: true, display: true, valueNumber: true, valueText: true, valueBoolean: true, unit: true, referenceLow: true, referenceHigh: true, referenceText: true, interpretation: true, isCritical: true, observedAt: true, order: { select: { procedureName: true } } } },
      appointments: { orderBy: { scheduledAt: "desc" }, select: { id: true, scheduledAt: true, durationMinutes: true, reason: true, status: true, doctor: { select: { name: true } } } },
      visits: {
        where: { status: "COMPLETED" }, orderBy: { createdAt: "desc" },
        select: { id: true, createdAt: true, signedAt: true, chiefComplaint: true, bp: true, temperature: true, pulse: true, weight: true, diagnosis: true, doctorNotes: true, advice: true, doctor: { select: { name: true } }, prescriptions: { select: { id: true, medicine: true, dosage: true, frequency: true, duration: true } }, testsOrdered: { select: { id: true, name: true } }, imagingRecommendations: { select: { id: true, code: true, name: true, modality: true, bodyPart: true, description: true } } },
      },
      invoices: { where: { status: { not: "VOID" } }, orderBy: { createdAt: "desc" }, select: { id: true, invoiceNo: true, subtotal: true, taxTotal: true, grandTotal: true, amountPaid: true, status: true, createdAt: true, items: { select: { id: true, category: true, description: true, quantity: true, total: true } } } },
    },
  });
  if (!patient) return NextResponse.json({ error: "Patient record not found." }, { status: 404 });
  return NextResponse.json(patient);
}

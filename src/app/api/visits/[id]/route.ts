import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const organizationId = (session.user as any).organizationId;

  const visit = await prisma.visit.findUnique({
    where: { id: params.id },
    include: { patient: { include: { allergies: true } }, prescriptions: true, testsOrdered: true, doctor: { select: { name: true } } },
  });

  if (!visit || visit.patient.organizationId !== organizationId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(visit);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["DOCTOR", "ADMIN"].includes((session.user as any).role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const organizationId = (session.user as any).organizationId;

  const existing = await prisma.visit.findUnique({ where: { id: params.id }, include: { patient: true, pharmacyOrder: true } });
  if (!existing || existing.patient.organizationId !== organizationId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { diagnosis, doctorNotes, prescriptions, testsOrdered, complete, sendToPharmacy } = body;

  const prescriptionItems = (prescriptions || []).filter((p: any) => p.medicine?.trim()).map((p: any) => ({ medicine: p.medicine.trim(), dosage: p.dosage?.trim() || null, frequency: p.frequency?.trim() || null, duration: p.duration?.trim() || null }));
  if (sendToPharmacy && prescriptionItems.length === 0) return NextResponse.json({ error: "Add at least one medicine before sending to pharmacy." }, { status: 400 });
  if (existing.pharmacyOrder && sendToPharmacy) return NextResponse.json({ error: "This prescription has already been sent to pharmacy." }, { status: 409 });

  const visit = await prisma.$transaction(async (tx) => {
    await tx.prescription.deleteMany({ where: { visitId: params.id } });
    await tx.testOrder.deleteMany({ where: { visitId: params.id } });
    const updated = await tx.visit.update({
    where: { id: params.id },
    data: {
      diagnosis, doctorNotes, doctorId: (session.user as any).id,
      status: complete ? "COMPLETED" : "WAITING",
      signedAt: complete ? new Date() : null,
      prescriptions: { create: prescriptionItems },
      testsOrdered: { create: (testsOrdered || []).map((name: string) => ({ name })) },
    },
    include: { prescriptions: true, testsOrdered: true, doctor: { select: { name: true } } },
    });
    if (sendToPharmacy) await tx.pharmacyOrder.create({ data: { visitId: params.id, patientId: existing.patientId, organizationId, items: { create: prescriptionItems } } });
    return updated;
  });

  return NextResponse.json(visit);
}

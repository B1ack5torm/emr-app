import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function computeTotals(items: { quantity: number; unitPrice: number; taxRatePercent: number }[]) {
  let subtotal = 0, taxTotal = 0;
  const computed = items.map((it) => {
    const amount = it.quantity * it.unitPrice;
    const taxAmount = Math.round((amount * it.taxRatePercent) / 100);
    subtotal += amount; taxTotal += taxAmount;
    return { ...it, amount, taxAmount, total: amount + taxAmount };
  });
  return { computed, subtotal, taxTotal, grandTotal: subtotal + taxTotal };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const organizationId = (session.user as any).organizationId;

  const invoice = await prisma.invoice.findUnique({
    where: { visitId: params.id },
    include: { items: true, payments: { orderBy: { paidAt: "desc" } }, patient: true },
  });
  if (!invoice || invoice.organizationId !== organizationId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(invoice);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["RECEPTION", "ADMIN"].includes((session.user as any).role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const organizationId = (session.user as any).organizationId;
  const userId = (session.user as any).id;

  const visit = await prisma.visit.findUnique({
    where: { id: params.id },
    include: { patient: true, prescriptions: true, testsOrdered: true, imagingOrders: true, invoice: true },
  });
  if (!visit || visit.patient.organizationId !== organizationId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (visit.invoice) return NextResponse.json({ error: "An invoice already exists for this visit." }, { status: 409 });

  const draftItems = [
    { category: "CONSULTATION" as const, description: `Consultation${visit.chiefComplaint ? " — " + visit.chiefComplaint : ""}`, quantity: 1, unitPrice: 0, taxRatePercent: 0 },
    ...visit.prescriptions.map((p) => ({ category: "MEDICINE" as const, description: `${p.medicine}${p.dosage ? " " + p.dosage : ""}`, quantity: 1, unitPrice: 0, taxRatePercent: 0 })),
    ...visit.testsOrdered.map((t) => ({ category: "TEST" as const, description: t.name, quantity: 1, unitPrice: 0, taxRatePercent: 0 })),
    ...visit.imagingOrders.map((o) => ({ category: "IMAGING" as const, description: `${o.procedureDescription}${o.bodyPart ? " - " + o.bodyPart : ""}`, quantity: 1, unitPrice: 0, taxRatePercent: 0 })),
  ];
  const { computed, subtotal, taxTotal, grandTotal } = computeTotals(draftItems);

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const invoice = await prisma.$transaction(async (tx) => {
        const agg = await tx.invoice.aggregate({ where: { organizationId }, _max: { invoiceNo: true } });
        return tx.invoice.create({
          data: {
            invoiceNo: (agg._max.invoiceNo || 0) + 1,
            visitId: visit.id, patientId: visit.patientId, organizationId,
            subtotal, taxTotal, grandTotal, status: "UNPAID", createdById: userId,
            items: { create: computed },
          },
          include: { items: true },
        });
      });
      return NextResponse.json(invoice, { status: 201 });
    } catch (e: any) {
      if (e.code === "P2002" && attempt < 4) continue;
      throw e;
    }
  }
}
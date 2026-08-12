import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["PHARMACIST", "ADMIN"].includes((session.user as any).role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const organizationId = (session.user as any).organizationId;
  const body = await req.json();
  const lines = (body.items || []).filter((i: any) => i.description?.trim() && Number.isInteger(Number(i.quantity)) && Number(i.quantity) > 0 && Number(i.unitPrice) >= 0)
    .map((i: any) => ({ description: i.description.trim(), quantity: Number(i.quantity), unitPrice: Math.round(Number(i.unitPrice) * 100), taxRatePercent: Math.max(0, Number(i.taxRatePercent) || 0) }));
  if (!lines.length) return NextResponse.json({ error: "Add at least one valid medicine line." }, { status: 400 });
  const order = await prisma.pharmacyOrder.findFirst({ where: { id: params.id, organizationId }, include: { invoice: true } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.invoice || order.status === "DISPENSED") return NextResponse.json({ error: "This order has already been dispensed." }, { status: 409 });
  const computed = lines.map((line: any) => { const amount = line.quantity * line.unitPrice; const taxAmount = Math.round(amount * line.taxRatePercent / 100); return { ...line, amount, taxAmount, total: amount + taxAmount }; });
  const subtotal = computed.reduce((total: number, line: any) => total + line.amount, 0);
  const taxTotal = computed.reduce((total: number, line: any) => total + line.taxAmount, 0);
  const invoice = await prisma.$transaction(async (tx) => {
    const max = await tx.pharmacyInvoice.aggregate({ where: { organizationId }, _max: { invoiceNo: true } });
    const created = await tx.pharmacyInvoice.create({ data: { invoiceNo: (max._max.invoiceNo || 0) + 1, pharmacyOrderId: order.id, patientId: order.patientId, organizationId, subtotal, taxTotal, grandTotal: subtotal + taxTotal, createdById: (session.user as any).id, items: { create: computed } }, include: { items: true, patient: true } });
    await tx.pharmacyOrder.update({ where: { id: order.id }, data: { status: "DISPENSED", dispensedAt: new Date() } });
    return created;
  });
  return NextResponse.json(invoice, { status: 201 });
}

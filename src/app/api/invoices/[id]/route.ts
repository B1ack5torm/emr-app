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
    where: { id: params.id },
    include: { items: true, payments: { orderBy: { paidAt: "desc" } }, patient: true, visit: true },
  });
  if (!invoice || invoice.organizationId !== organizationId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(invoice);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["RECEPTION", "ADMIN", "SUPER_ADMIN"].includes((session.user as any).role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const organizationId = (session.user as any).organizationId;

  const existing = await prisma.invoice.findUnique({ where: { id: params.id } });
  if (!existing || existing.organizationId !== organizationId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status === "VOID") return NextResponse.json({ error: "Cannot edit a voided invoice." }, { status: 400 });

  const body = await req.json();
  if (body.voided) {
    const updated = await prisma.invoice.update({ where: { id: params.id }, data: { status: "VOID" } });
    return NextResponse.json(updated);
  }

  const { items } = body;
  if (!Array.isArray(items) || items.length === 0) return NextResponse.json({ error: "At least one line item is required." }, { status: 400 });

  const { computed, subtotal, taxTotal, grandTotal } = computeTotals(items.map((it: any) => ({
    category: it.category, description: it.description, quantity: Number(it.quantity) || 1,
    unitPrice: Math.round(Number(it.unitPrice) || 0), taxRatePercent: Number(it.taxRatePercent) || 0,
  })));
  const newStatus = existing.amountPaid >= grandTotal && grandTotal > 0 ? "PAID" : existing.amountPaid > 0 ? "PARTIALLY_PAID" : "UNPAID";

  await prisma.invoiceItem.deleteMany({ where: { invoiceId: params.id } });
  const updated = await prisma.invoice.update({
    where: { id: params.id },
    data: { subtotal, taxTotal, grandTotal, status: newStatus, items: { create: computed.map(({ category, ...rest }: any) => ({ category, ...rest })) } },
    include: { items: true, payments: true },
  });
  return NextResponse.json(updated);
}

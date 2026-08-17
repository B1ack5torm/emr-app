import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";
import { calculateInvoice, invoiceSettlementStatus } from "@/lib/domain/billing";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requirePermission("invoice:create");
  if (access.response) return access.response;
  const session = { user: access.user } as any;
  const organizationId = (session.user as any).organizationId;

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { items: true, payments: { orderBy: { paidAt: "desc" } }, refunds: { orderBy: { createdAt: "desc" } }, patient: true, visit: true },
  });
  if (!invoice || invoice.organizationId !== organizationId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(invoice);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requirePermission("invoice:create");
  if (access.response) return access.response;
  const session = { user: access.user } as any;
  const organizationId = (session.user as any).organizationId;

  const existing = await prisma.invoice.findUnique({ where: { id: params.id }, include: { refunds: true } });
  if (!existing || existing.organizationId !== organizationId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (["VOID", "REFUNDED"].includes(existing.status)) return NextResponse.json({ error: "Cannot edit this invoice." }, { status: 400 });

  const body = await req.json();
  if (body.voided) {
    const reason = String(body.reason || "").trim();
    if (!reason) return NextResponse.json({ error: "A reason is required to void an invoice." }, { status: 400 });
    const updated = await prisma.invoice.update({ where: { id: params.id }, data: { status: "VOID" } });
    await audit({ organizationId, userId: (session.user as any).id, patientId: existing.patientId, action: "INVOICE_VOIDED", resourceType: "Invoice", resourceId: existing.id, reason, request: req });
    return NextResponse.json(updated);
  }

  const { items } = body;
  if (!Array.isArray(items) || items.length === 0) return NextResponse.json({ error: "At least one line item is required." }, { status: 400 });

  if (items.some((item: any) => !["CONSULTATION", "MEDICINE", "TEST", "IMAGING", "OTHER"].includes(item.category))) return NextResponse.json({ error: "Invalid invoice category." }, { status: 400 });
  let totals;
  try {
    totals = calculateInvoice(items.map((it: any) => ({ category: it.category, description: String(it.description || ""), quantity: Number(it.quantity), unitPrice: Math.round(Number(it.unitPrice)), taxRatePercent: Number(it.taxRatePercent), discount: Math.round(Number(it.discount) || 0) })));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid invoice lines." }, { status: 400 });
  }
  const { items: computed, subtotal, taxTotal, grandTotal } = totals;
  const refunded = existing.refunds.reduce((sum, item) => sum + item.amount, 0);
  const newStatus = invoiceSettlementStatus(grandTotal, existing.amountPaid, refunded);

  await prisma.invoiceItem.deleteMany({ where: { invoiceId: params.id } });
  const updated = await prisma.invoice.update({
    where: { id: params.id },
    data: { subtotal, taxTotal, grandTotal, status: newStatus, items: { create: computed.map(({ category, discount, ...rest }: any) => ({ category, ...rest, discountAmount: discount, discountAuthorizedById: discount > 0 ? (session.user as any).id : null })) } },
    include: { items: true, payments: true },
  });
  await audit({ organizationId, userId: (session.user as any).id, patientId: existing.patientId, action: "INVOICE_UPDATED", resourceType: "Invoice", resourceId: existing.id, newValue: { subtotal, taxTotal, grandTotal, status: newStatus }, request: req });
  return NextResponse.json(updated);
}

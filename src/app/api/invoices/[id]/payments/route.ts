import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { audit, requirePermission } from "@/lib/security";
import { randomBytes } from "crypto";
import { invoiceSettlementStatus } from "@/lib/domain/billing";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requirePermission("payment:record");
  if (access.response) return access.response;
  const session = { user: access.user } as any;
  const organizationId = (session.user as any).organizationId;
  const userId = (session.user as any).id;

  const invoice = await prisma.invoice.findFirst({ where: { id: params.id, organizationId }, include: { refunds: true } });
  if (!invoice || invoice.organizationId !== organizationId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (["VOID", "REFUNDED"].includes(invoice.status)) return NextResponse.json({ error: "Cannot record a payment on this invoice." }, { status: 400 });

  const { amount, method, reference } = await req.json();
  const amt = Math.round(Number(amount));
  if (!amt || amt <= 0) return NextResponse.json({ error: "A positive payment amount is required." }, { status: 400 });
  if (!["CASH", "CARD", "UPI", "BANK_TRANSFER", "OTHER"].includes(method)) return NextResponse.json({ error: "Invalid payment method." }, { status: 400 });

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      const current = await tx.invoice.findFirst({ where: { id: params.id, organizationId }, include: { refunds: true } });
      if (!current || ["VOID", "REFUNDED"].includes(current.status)) throw new Error("INVOICE_UNAVAILABLE");
      const refunded = current.refunds.reduce((sum, item) => sum + item.amount, 0), netPaid = current.amountPaid - refunded;
      const remaining = current.grandTotal - netPaid;
      if (amt > remaining) throw new Error(`PAYMENT_EXCEEDS:${remaining}`);
      const receiptNumber = `RCPT-${new Date().getUTCFullYear()}-${randomBytes(5).toString("hex").toUpperCase()}`;
      const payment = await tx.payment.create({ data: { invoiceId: params.id, amount: amt, method, reference: String(reference || "").trim().slice(0, 200) || null, recordedById: userId, receiptNumber } });
      const updatedInvoice = await tx.invoice.update({ where: { id: params.id }, data: { amountPaid: { increment: amt }, status: invoiceSettlementStatus(current.grandTotal, current.amountPaid + amt, refunded) } });
      return { payment, updatedInvoice };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("PAYMENT_EXCEEDS:")) { const remaining = Number(error.message.split(":")[1]); return NextResponse.json({ error: `Payment exceeds remaining balance of ₹${(remaining / 100).toFixed(2)}.` }, { status: 400 }); }
    if (error instanceof Error && error.message === "INVOICE_UNAVAILABLE") return NextResponse.json({ error: "Invoice is unavailable for payment." }, { status: 409 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "The invoice changed while recording payment. Please retry." }, { status: 409 });
    throw error;
  }
  const { payment, updatedInvoice } = result;
  await audit({ organizationId, userId, patientId: invoice.patientId, action: "PAYMENT_RECORDED", resourceType: "Payment", resourceId: payment.id, newValue: { invoiceId: invoice.id, amount: amt, method }, request: req });
  return NextResponse.json({ payment, invoice: updatedInvoice }, { status: 201 });
}

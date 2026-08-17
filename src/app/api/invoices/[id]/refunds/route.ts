import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";
import { invoiceSettlementStatus } from "@/lib/domain/billing";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requirePermission("payment:record"); if (access.response) return access.response;
  const body = await request.json(), amount = Math.round(Number(body.amount)), reason = String(body.reason || "").trim(), organizationId = access.user.organizationId;
  if (!Number.isSafeInteger(amount) || amount <= 0 || reason.length < 5) return NextResponse.json({ error: "Positive refund amount and reason of at least five characters are required." }, { status: 400 });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({ where: { id: params.id, organizationId }, include: { refunds: true, payments: true } }); if (!invoice || ["VOID", "DRAFT", "REFUNDED"].includes(invoice.status)) throw new Error("INVOICE_UNAVAILABLE");
      const refunded = invoice.refunds.reduce((sum, item) => sum + item.amount, 0), refundable = invoice.amountPaid - refunded; if (amount > refundable) throw new Error(`EXCEEDS:${refundable}`);
      if (body.paymentId) {
        const payment = invoice.payments.find((item) => item.id === body.paymentId); if (!payment) throw new Error("PAYMENT_UNAVAILABLE");
        const paymentRefunded = invoice.refunds.filter((item) => item.paymentId === payment.id).reduce((sum, item) => sum + item.amount, 0); if (amount > payment.amount - paymentRefunded) throw new Error(`EXCEEDS:${payment.amount - paymentRefunded}`);
      }
      const refund = await tx.refund.create({ data: { organizationId, invoiceId: invoice.id, paymentId: body.paymentId || null, amount, reason: reason.slice(0, 2000), reference: String(body.reference || "").trim().slice(0, 200) || null, createdById: access.user.id } });
      const totalRefunded = refunded + amount, status = invoiceSettlementStatus(invoice.grandTotal, invoice.amountPaid, totalRefunded);
      await tx.invoice.update({ where: { id: invoice.id }, data: { status } }); return { refund, patientId: invoice.patientId };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await audit({ organizationId, userId: access.user.id, patientId: result.patientId, action: "INVOICE_REFUNDED", resourceType: "Refund", resourceId: result.refund.id, newValue: { invoiceId: params.id, amount }, reason, request }); return NextResponse.json(result.refund, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INVOICE_UNAVAILABLE") return NextResponse.json({ error: "Invoice is unavailable for refund." }, { status: 409 });
    if (error instanceof Error && error.message === "PAYMENT_UNAVAILABLE") return NextResponse.json({ error: "Selected payment does not belong to this invoice." }, { status: 400 });
    if (error instanceof Error && error.message.startsWith("EXCEEDS:")) return NextResponse.json({ error: `Refund exceeds refundable amount of ₹${(Number(error.message.split(":")[1]) / 100).toFixed(2)}.` }, { status: 400 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "Invoice changed while refunding. Retry." }, { status: 409 }); throw error;
  }
}

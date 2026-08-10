import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["RECEPTION", "ADMIN"].includes((session.user as any).role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const organizationId = (session.user as any).organizationId;
  const userId = (session.user as any).id;

  const invoice = await prisma.invoice.findUnique({ where: { id: params.id } });
  if (!invoice || invoice.organizationId !== organizationId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (invoice.status === "VOID") return NextResponse.json({ error: "Cannot record a payment on a voided invoice." }, { status: 400 });

  const { amount, method, reference } = await req.json();
  const amt = Math.round(Number(amount));
  if (!amt || amt <= 0) return NextResponse.json({ error: "A positive payment amount is required." }, { status: 400 });
  if (!["CASH", "CARD", "UPI", "BANK_TRANSFER", "OTHER"].includes(method)) return NextResponse.json({ error: "Invalid payment method." }, { status: 400 });

  const remaining = invoice.grandTotal - invoice.amountPaid;
  if (amt > remaining) return NextResponse.json({ error: `Payment exceeds remaining balance of ₹${(remaining / 100).toFixed(2)}.` }, { status: 400 });

  const [payment, updatedInvoice] = await prisma.$transaction([
    prisma.payment.create({ data: { invoiceId: params.id, amount: amt, method, reference, recordedById: userId } }),
    prisma.invoice.update({
      where: { id: params.id },
      data: { amountPaid: { increment: amt }, status: invoice.amountPaid + amt >= invoice.grandTotal ? "PAID" : "PARTIALLY_PAID" },
    }),
  ]);
  return NextResponse.json({ payment, invoice: updatedInvoice }, { status: 201 });
}
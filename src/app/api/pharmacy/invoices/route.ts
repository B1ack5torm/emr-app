import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["PHARMACIST", "ADMIN"].includes((session.user as any).role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const organizationId = (session.user as any).organizationId;

  const invoices = await prisma.pharmacyInvoice.findMany({
    where: { organizationId },
    include: { patient: { select: { name: true, mrn: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(invoices);
}
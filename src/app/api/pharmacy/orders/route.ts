import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["PHARMACIST", "ADMIN"].includes((session.user as any).role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const status = req.nextUrl.searchParams.get("status");
  const orders = await prisma.pharmacyOrder.findMany({
    where: { organizationId: (session.user as any).organizationId, ...(status ? { status: status as any } : {}) },
    include: { patient: { select: { name: true, mrn: true, age: true, gender: true, phone: true } }, items: true, invoice: true, visit: { select: { chiefComplaint: true, doctor: { select: { name: true } } } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(orders);
}

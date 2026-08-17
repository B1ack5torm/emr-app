import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security";

export async function GET(req: NextRequest) {
  const access = await requirePermission("invoice:create");
  if (access.response) return access.response;
  const session = { user: access.user } as any;
  const organizationId = (session.user as any).organizationId;
  const status = req.nextUrl.searchParams.get("status");

  const invoices = await prisma.invoice.findMany({
    where: { organizationId, ...(status ? { status: status as any } : {}) },
    include: { patient: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(invoices);
}

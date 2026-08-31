import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security";

export async function GET() {
  const access = await requirePermission("order:create");
  if (access.response) return access.response;
  const procedures = await prisma.serviceCatalogItem.findMany({
    where: { organizationId: access.user.organizationId, category: "IMAGING", active: true },
    select: { id: true, code: true, name: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(procedures);
}

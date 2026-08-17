import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security";

export async function GET(request: NextRequest) {
  const access = await requirePermission("audit:read");
  if (access.response) return access.response;
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("pageSize")) || 50));
  const events = await prisma.auditEvent.findMany({ where: { organizationId: access.user.organizationId }, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize });
  return NextResponse.json({ page, pageSize, events });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";

export async function GET() {
  const access = await requirePermission("settings:manage"); if (access.response) return access.response;
  return NextResponse.json(await prisma.taxConfiguration.findMany({ where: { organizationId: access.user.organizationId }, include: { clinic: { select: { id: true, name: true } } }, orderBy: { name: "asc" } }));
}
export async function POST(request: NextRequest) {
  const access = await requirePermission("settings:manage"); if (access.response) return access.response;
  const body = await request.json(), organizationId = access.user.organizationId, ratePercent = Number(body.ratePercent);
  const clinic = await prisma.clinicLocation.findFirst({ where: { id: body.clinicId, organizationId } }); if (!clinic) return NextResponse.json({ error: "Clinic not found." }, { status: 404 });
  if (!String(body.name || "").trim() || !Number.isFinite(ratePercent) || ratePercent < 0 || ratePercent > 100) return NextResponse.json({ error: "Valid tax name and rate from 0 to 100 are required." }, { status: 400 });
  const tax = await prisma.taxConfiguration.create({ data: { organizationId, clinicId: clinic.id, name: String(body.name).trim(), ratePercent, effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : null, effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null } });
  await audit({ organizationId, userId: access.user.id, action: "TAX_CONFIGURED", resourceType: "TaxConfiguration", resourceId: tax.id, request }); return NextResponse.json(tax, { status: 201 });
}

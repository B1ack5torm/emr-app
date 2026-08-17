import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";

export async function GET() {
  const access = await requirePermission("settings:manage"); if (access.response) return access.response;
  return NextResponse.json(await prisma.serviceCatalogItem.findMany({ where: { organizationId: access.user.organizationId }, include: { prices: { include: { clinic: { select: { id: true, name: true } } } } }, orderBy: { name: "asc" } }));
}

export async function POST(request: NextRequest) {
  const access = await requirePermission("settings:manage"); if (access.response) return access.response;
  const body = await request.json(), organizationId = access.user.organizationId;
  if (!/^[A-Z0-9_-]{2,30}$/.test(String(body.code || "").toUpperCase()) || !String(body.name || "").trim() || !["CONSULTATION", "MEDICINE", "TEST", "IMAGING", "OTHER"].includes(body.category)) return NextResponse.json({ error: "Valid code, name, and category are required." }, { status: 400 });
  const clinic = await prisma.clinicLocation.findFirst({ where: { id: body.clinicId, organizationId } }); if (!clinic) return NextResponse.json({ error: "Clinic not found." }, { status: 404 });
  const unitPrice = Math.round(Number(body.unitPrice)); if (unitPrice < 0) return NextResponse.json({ error: "Unit price must be a non-negative amount in paise." }, { status: 400 });
  const service = await prisma.$transaction(async (tx) => {
    const item = await tx.serviceCatalogItem.upsert({ where: { organizationId_code: { organizationId, code: String(body.code).toUpperCase() } }, update: { name: String(body.name).trim(), category: body.category, taxable: !!body.taxable, active: true }, create: { organizationId, code: String(body.code).toUpperCase(), name: String(body.name).trim(), category: body.category, taxable: !!body.taxable } });
    await tx.clinicPrice.upsert({ where: { clinicId_serviceId: { clinicId: clinic.id, serviceId: item.id } }, update: { unitPrice, active: true }, create: { organizationId, clinicId: clinic.id, serviceId: item.id, unitPrice } }); return item;
  });
  await audit({ organizationId, userId: access.user.id, action: "SERVICE_CATALOG_CONFIGURED", resourceType: "ServiceCatalogItem", resourceId: service.id, request });
  return NextResponse.json(service, { status: 201 });
}

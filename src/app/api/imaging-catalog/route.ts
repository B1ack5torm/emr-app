import { NextRequest, NextResponse } from "next/server";
import { imagingCatalog, searchImagingCatalog, type ImagingCatalogItem } from "@/lib/imaging-catalog";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security";

export async function GET(request: NextRequest) {
  const access = await requirePermission("order:create");
  if (access.response) return access.response;
  const configured = await prisma.serviceCatalogItem.findMany({
    where: { organizationId: access.user.organizationId, category: "IMAGING", active: true },
    select: { code: true, name: true }, orderBy: { name: "asc" },
  });
  const hospitalItems: ImagingCatalogItem[] = configured.map((item) => ({
    code: item.code, name: item.name, modality: "Hospital catalog", bodyPart: "Not specified",
    description: `${item.name} — hospital-configured imaging procedure.`, aliases: [],
  }));
  const configuredNames = new Set(hospitalItems.map((item) => item.name.toLocaleLowerCase()));
  const catalog = [...hospitalItems, ...imagingCatalog.filter((item) => !configuredNames.has(item.name.toLocaleLowerCase()))];
  const query = request.nextUrl.searchParams.get("q")?.trim() || "";
  return NextResponse.json({ procedures: query ? searchImagingCatalog(query, 50, catalog) : catalog, total: catalog.length });
}

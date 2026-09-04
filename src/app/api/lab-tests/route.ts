import { NextRequest, NextResponse } from "next/server";
import { labTestCatalog, searchLabTests, type LabTestCatalogItem } from "@/lib/lab-test-catalog";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security";

export async function GET(request: NextRequest) {
  const access = await requirePermission("order:create");
  if (access.response) return access.response;

  const configured = await prisma.serviceCatalogItem.findMany({
    where: { organizationId: access.user.organizationId, category: "TEST", active: true },
    select: { code: true, name: true },
    orderBy: { name: "asc" },
  });
  const hospitalTests: LabTestCatalogItem[] = configured.map((test) => ({
    code: test.code,
    name: test.name,
    category: "Hospital catalog",
    aliases: [],
  }));
  const configuredNames = new Set(hospitalTests.map((test) => test.name.toLocaleLowerCase()));
  const catalog = [...hospitalTests, ...labTestCatalog.filter((test) => !configuredNames.has(test.name.toLocaleLowerCase()))];
  const query = request.nextUrl.searchParams.get("q")?.trim() || "";

  return NextResponse.json({ tests: query ? searchLabTests(query, 50, catalog) : catalog, total: catalog.length });
}

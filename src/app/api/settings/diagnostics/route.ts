import { NextRequest, NextResponse } from "next/server";
import { audit, requirePermission } from "@/lib/security";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requirePermission("settings:manage");
  if (access.response) return access.response;
  const organization = await prisma.organization.findUnique({
    where: { id: access.user.organizationId },
    select: { operationalDiagnosticOrdersEnabled: true, operationalImagingOrdersEnabled: true },
  });
  if (!organization) return NextResponse.json({ error: "Hospital not found." }, { status: 404 });
  return NextResponse.json(organization);
}

export async function PATCH(request: NextRequest) {
  const access = await requirePermission("settings:manage");
  if (access.response) return access.response;
  const body = await request.json();
  const diagnosticSupplied = body.operationalDiagnosticOrdersEnabled !== undefined;
  const imagingSupplied = body.operationalImagingOrdersEnabled !== undefined;
  if ((!diagnosticSupplied && !imagingSupplied)
    || (diagnosticSupplied && typeof body.operationalDiagnosticOrdersEnabled !== "boolean")
    || (imagingSupplied && typeof body.operationalImagingOrdersEnabled !== "boolean")) {
    return NextResponse.json({ error: "At least one valid boolean order setting is required." }, { status: 400 });
  }
  const previous = await prisma.organization.findUnique({
    where: { id: access.user.organizationId },
    select: { operationalDiagnosticOrdersEnabled: true, operationalImagingOrdersEnabled: true },
  });
  if (!previous) return NextResponse.json({ error: "Hospital not found." }, { status: 404 });
  const organization = await prisma.organization.update({
    where: { id: access.user.organizationId },
    data: {
      ...(diagnosticSupplied ? { operationalDiagnosticOrdersEnabled: body.operationalDiagnosticOrdersEnabled } : {}),
      ...(imagingSupplied ? { operationalImagingOrdersEnabled: body.operationalImagingOrdersEnabled } : {}),
    },
    select: { operationalDiagnosticOrdersEnabled: true, operationalImagingOrdersEnabled: true },
  });
  await audit({
    organizationId: access.user.organizationId,
    userId: access.user.id,
    action: "DIAGNOSTIC_ORDER_SETTINGS_UPDATED",
    resourceType: "Organization",
    resourceId: access.user.organizationId,
    previousValue: previous,
    newValue: organization,
    request,
  });
  return NextResponse.json(organization);
}

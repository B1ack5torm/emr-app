import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";

export async function GET() {
  const access = await requirePermission("settings:manage");
  if (access.response) return access.response;
  const organization = await prisma.organization.findUnique({
    where: { id: access.user.organizationId },
    select: { onlineBookingEnabled: true, slug: true },
  });
  if (!organization) return NextResponse.json({ error: "Hospital not found." }, { status: 404 });
  return NextResponse.json(organization);
}

export async function PATCH(request: NextRequest) {
  const access = await requirePermission("settings:manage");
  if (access.response) return access.response;
  const body = await request.json();
  if (typeof body.onlineBookingEnabled !== "boolean") return NextResponse.json({ error: "A valid online-booking setting is required." }, { status: 400 });
  const previous = await prisma.organization.findUnique({ where: { id: access.user.organizationId }, select: { onlineBookingEnabled: true } });
  if (!previous) return NextResponse.json({ error: "Hospital not found." }, { status: 404 });
  const organization = await prisma.organization.update({
    where: { id: access.user.organizationId },
    data: { onlineBookingEnabled: body.onlineBookingEnabled },
    select: { onlineBookingEnabled: true, slug: true },
  });
  await audit({ organizationId: access.user.organizationId, userId: access.user.id, action: "ONLINE_BOOKING_SETTING_UPDATED", resourceType: "Organization", resourceId: access.user.organizationId, previousValue: previous, newValue: { onlineBookingEnabled: organization.onlineBookingEnabled }, request });
  return NextResponse.json(organization);
}

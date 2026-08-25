import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security";

export async function GET() {
  const access = await requirePermission("appointment:manage");
  if (access.response) return access.response;
  const session = { user: access.user } as any;

  const doctors = await prisma.user.findMany({
    where: { organizationId: (session.user as any).organizationId, role: "DOCTOR", status: "ACTIVE" },
    select: { id: true, name: true, practitionerProfile: { select: { specialty: true, clinic: { select: { id: true, name: true, appointmentTypes: { where: { active: true }, select: { id: true, name: true, durationMinutes: true } } } } } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(doctors);
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requirePermission("appointment:manage");
  if (access.response) return access.response;
  const user = access.user as any;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const requests = await prisma.appointmentRequest.findMany({
    where: {
      OR: [{ status: "PENDING" }, { status: "CONFIRMED", requestedAt: { gte: today } }],
      ...(user.role === "DOCTOR" ? { doctorId: user.id, organizationId: user.organizationId } : { organizationId: user.organizationId }),
    },
    include: { doctor: { select: { id: true, name: true } } },
    orderBy: [{ status: "desc" }, { requestedAt: "asc" }],
  });

  return NextResponse.json(requests);
}

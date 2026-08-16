import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (!["DOCTOR", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const requests = await prisma.appointmentRequest.findMany({
    where: {
      OR: [{ status: "PENDING" }, { status: "CONFIRMED", requestedAt: { gte: today } }],
      ...(user.role === "DOCTOR" ? { doctorId: user.id } : {}),
      ...(user.role === "ADMIN" ? { organizationId: user.organizationId } : {}),
    },
    include: { doctor: { select: { id: true, name: true } } },
    orderBy: [{ status: "desc" }, { requestedAt: "asc" }],
  });

  return NextResponse.json(requests);
}

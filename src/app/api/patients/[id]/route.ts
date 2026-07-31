import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const organizationId = (session.user as any).organizationId;

  const patient = await prisma.patient.findUnique({
    where: { id: params.id },
    include: { allergies: true, visits: { orderBy: { createdAt: "desc" }, include: { prescriptions: true, testsOrdered: true, doctor: { select: { name: true } } } } },
  });

  if (!patient || patient.organizationId !== organizationId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(patient);
}
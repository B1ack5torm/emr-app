import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const organizationId = (session.user as any).organizationId;
  const invite = await prisma.invite.findUnique({ where: { id: params.id } });
  if (!invite || invite.organizationId !== organizationId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.invite.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requirePermission("user:manage");
  if (access.response) return access.response;

  const organizationId = access.user!.organizationId;
  const invite = await prisma.invite.findUnique({ where: { id: params.id } });
  if (!invite || invite.organizationId !== organizationId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.invite.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

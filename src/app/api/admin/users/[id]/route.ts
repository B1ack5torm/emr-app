import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SUPER_ADMIN"].includes((session.user as any).role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const orgId = (session.user as any).organizationId;
  const isSuperAdmin = (session.user as any).role === "SUPER_ADMIN";
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target || (!isSuperAdmin && target.organizationId !== orgId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.role === "SUPER_ADMIN") return NextResponse.json({ error: "The Super Admin role cannot be changed here." }, { status: 403 });

  const body = await req.json();

  if (body.action === "approve") {
    if (!["RECEPTION", "DOCTOR", "ADMIN"].includes(body.role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    const updated = await prisma.user.update({ where: { id: params.id }, data: { status: "ACTIVE", role: body.role } });
    return NextResponse.json(updated);
  }
  if (body.action === "reject") {
    const updated = await prisma.user.update({ where: { id: params.id }, data: { status: "REJECTED" } });
    return NextResponse.json(updated);
  }
  if (body.action === "changeRole") {
    if (!["RECEPTION", "DOCTOR", "ADMIN"].includes(body.role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    const updated = await prisma.user.update({ where: { id: params.id }, data: { role: body.role } });
    return NextResponse.json(updated);
  }
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SUPER_ADMIN"].includes((session.user as any).role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const orgId = (session.user as any).organizationId;
  const isSuperAdmin = (session.user as any).role === "SUPER_ADMIN";
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target || (!isSuperAdmin && target.organizationId !== orgId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (target.role === "SUPER_ADMIN") return NextResponse.json({ error: "The Super Admin account cannot be removed." }, { status: 403 });
  if (target.id === (session.user as any).id) {
    return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

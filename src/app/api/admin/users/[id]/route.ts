import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const orgId = (session.user as any).organizationId;
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target || target.organizationId !== orgId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  if (body.action === "approve") {
    if (!["RECEPTION", "DOCTOR", "PHARMACIST", "ADMIN"].includes(body.role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    const updated = await prisma.user.update({ where: { id: params.id }, data: { status: "ACTIVE", role: body.role } });
    return NextResponse.json(updated);
  }
  if (body.action === "reject") {
    const updated = await prisma.user.update({ where: { id: params.id }, data: { status: "REJECTED" } });
    return NextResponse.json(updated);
  }
  if (body.action === "changeRole") {
    if (!["RECEPTION", "DOCTOR", "PHARMACIST", "ADMIN"].includes(body.role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    const updated = await prisma.user.update({ where: { id: params.id }, data: { role: body.role } });
    return NextResponse.json(updated);
  }
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const orgId = (session.user as any).organizationId;
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target || target.organizationId !== orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (target.id === (session.user as any).id) {
    return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

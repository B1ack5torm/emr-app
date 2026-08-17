import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";

const assignableRoles = ["CLINIC_ADMIN", "ADMIN", "DOCTOR", "NURSE", "FRONT_DESK", "RECEPTION", "BILLING", "LAB_RADIOLOGY"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requirePermission("user:manage");
  if (access.response) return access.response;
  const session = { user: access.user } as any;

  const orgId = (session.user as any).organizationId;
  const isSuperAdmin = (session.user as any).role === "SUPER_ADMIN";
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target || (!isSuperAdmin && target.organizationId !== orgId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.role === "SUPER_ADMIN") return NextResponse.json({ error: "The Super Admin role cannot be changed here." }, { status: 403 });

  const body = await req.json();

  if (body.action === "approve") {
    if (!assignableRoles.includes(body.role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    const updated = await prisma.user.update({ where: { id: params.id }, data: { status: "ACTIVE", role: body.role } });
    await audit({ organizationId: target.organizationId, userId: (session.user as any).id, action: "USER_APPROVED", resourceType: "User", resourceId: target.id, newValue: { role: body.role, status: "ACTIVE" }, request: req });
    return NextResponse.json(updated);
  }
  if (body.action === "reject") {
    const updated = await prisma.user.update({ where: { id: params.id }, data: { status: "REJECTED" } });
    await audit({ organizationId: target.organizationId, userId: (session.user as any).id, action: "USER_REJECTED", resourceType: "User", resourceId: target.id, request: req });
    return NextResponse.json(updated);
  }
  if (body.action === "changeRole") {
    if (!assignableRoles.includes(body.role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    const updated = await prisma.user.update({ where: { id: params.id }, data: { role: body.role } });
    await audit({ organizationId: target.organizationId, userId: (session.user as any).id, action: "USER_ROLE_CHANGED", resourceType: "User", resourceId: target.id, previousValue: { role: target.role }, newValue: { role: body.role }, request: req });
    return NextResponse.json(updated);
  }
  if (["suspend", "activate"].includes(body.action)) {
    const status = body.action === "suspend" ? "SUSPENDED" : "ACTIVE";
    const updated = await prisma.user.update({ where: { id: params.id }, data: { status } });
    await audit({ organizationId: target.organizationId, userId: (session.user as any).id, action: body.action === "suspend" ? "USER_SUSPENDED" : "USER_ACTIVATED", resourceType: "User", resourceId: target.id, previousValue: { status: target.status }, newValue: { status }, reason: String(body.reason || "").trim() || undefined, request: req });
    return NextResponse.json(updated);
  }
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requirePermission("user:manage");
  if (access.response) return access.response;
  const session = { user: access.user } as any;

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

  await prisma.user.update({ where: { id: params.id }, data: { status: "SUSPENDED" } });
  await audit({ organizationId: target.organizationId, userId: (session.user as any).id, action: "USER_SUSPENDED", resourceType: "User", resourceId: target.id, reason: "Administrative deactivation", request: _req });
  return NextResponse.json({ success: true, status: "SUSPENDED" });
}

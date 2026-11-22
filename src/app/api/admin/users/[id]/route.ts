import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-session";
import { authOptions } from "@/lib/auth";
import { auditLogFields, mirrorAuditEvent } from "@/lib/audit-events";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";
import bcrypt from "bcryptjs";

const assignableRoles = ["CLINIC_ADMIN", "ADMIN", "DOCTOR", "NURSE", "FRONT_DESK", "RECEPTION", "BILLING", "LAB_RADIOLOGY"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requirePermission("user:manage");
  if (access.response) return access.response;
  const session = { user: access.user } as any;

  const orgId = (session.user as any).organizationId;
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target || target.organizationId !== orgId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.role === "SUPER_ADMIN") return NextResponse.json({ error: "The Super Admin role cannot be changed here." }, { status: 403 });

  const body = await req.json();

  if (body.action === "resetPassword") {
    if (target.id === access.user.id) return NextResponse.json({ error: "Use Change password for your own account." }, { status: 400 });
    if (target.status !== "ACTIVE") return NextResponse.json({ error: "Only active accounts can have their password reset." }, { status: 400 });
    const password = body.password;
    if (typeof password !== "string" || password.length < 8 || Buffer.byteLength(password, "utf8") > 72 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return NextResponse.json({ error: "Use 8–72 characters containing a letter and number." }, { status: 400 });
    }
    const changedAt = new Date();
    const passwordHash = await bcrypt.hash(password, 12);
    const resetEvent = await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: target.id }, data: { passwordHash, mustChangePassword: true, passwordChangedAt: changedAt } });
      await tx.passwordResetToken.updateMany({ where: { userId: target.id, usedAt: null }, data: { usedAt: changedAt } });
      return tx.auditEvent.create({ data: { organizationId: target.organizationId, userId: access.user.id, action: "ADMIN_PASSWORD_RESET", resourceType: "User", resourceId: target.id, newValue: { mustChangePassword: true } }, select: auditLogFields });
    });
    await mirrorAuditEvent(resetEvent);
    return NextResponse.json({ success: true, message: "Temporary password saved. The user must change it at their next sign-in." });
  }

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
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target || target.organizationId !== orgId) {
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

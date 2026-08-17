import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type Permission =
  | "patient:create" | "patient:read" | "patient:update"
  | "appointment:create" | "appointment:manage"
  | "encounter:create" | "encounter:finalize" | "prescription:create" | "order:create"
  | "result:review" | "document:upload" | "invoice:create" | "payment:record" | "audit:read" | "user:manage" | "settings:manage";

const allPermissions: Permission[] = ["patient:create", "patient:read", "patient:update", "appointment:create", "appointment:manage", "encounter:create", "encounter:finalize", "prescription:create", "order:create", "result:review", "document:upload", "invoice:create", "payment:record", "audit:read", "user:manage", "settings:manage"];
const permissionsByRole: Record<string, Permission[]> = {
  SUPER_ADMIN: allPermissions,
  ADMIN: allPermissions,
  CLINIC_ADMIN: allPermissions,
  DOCTOR: ["patient:read", "appointment:manage", "encounter:create", "encounter:finalize", "prescription:create", "order:create", "result:review", "document:upload"],
  NURSE: ["patient:read", "patient:update", "appointment:manage", "encounter:create", "document:upload"],
  RECEPTION: ["patient:create", "patient:read", "patient:update", "appointment:create", "appointment:manage", "encounter:create", "document:upload", "invoice:create", "payment:record"],
  FRONT_DESK: ["patient:create", "patient:read", "patient:update", "appointment:create", "appointment:manage", "encounter:create", "document:upload"],
  BILLING: ["patient:read", "invoice:create", "payment:record"],
  LAB_RADIOLOGY: ["patient:read", "order:create", "document:upload"],
  PATIENT: [],
};

export function roleHasPermission(role: string | null | undefined, permission: Permission) {
  return !!role && !!permissionsByRole[role]?.includes(permission);
}

export async function requirePermission(permission: Permission) {
  const session = await getServerSession(authOptions);
  if (!session) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const sessionUser = session.user as any;
  const currentUser = await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { id: true, role: true, status: true, organizationId: true } });
  if (!currentUser || currentUser.status !== "ACTIVE" || currentUser.organizationId !== sessionUser.organizationId) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const user = { ...sessionUser, ...currentUser };
  if (!roleHasPermission(user.role, permission)) return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { user };
}

export function requestContext(request?: NextRequest) {
  return {
    ipAddress: request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    requestId: request?.headers.get("x-request-id") || null,
  };
}

/** Metadata must be small, non-sensitive operational fields; never pass credentials or clinical note bodies. */
export async function audit(input: { organizationId: string; userId?: string; patientId?: string; action: string; resourceType: string; resourceId?: string; previousValue?: object; newValue?: object; reason?: string; request?: NextRequest }) {
  const { request, ...event } = input;
  await prisma.auditEvent.create({ data: { ...event, ...requestContext(request) } });
}

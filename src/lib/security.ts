import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

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

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role | null;
  organizationId: string;
  organizationName: string;
  mustChangePassword: boolean;
};

type AccessResult =
  | { response: NextResponse; user?: never }
  | { response?: never; user: CurrentUser };

export function roleHasPermission(role: string | null | undefined, permission: Permission) {
  return !!role && !!permissionsByRole[role]?.includes(permission);
}

export async function requireCurrentUser(): Promise<AccessResult> {
  const session = await getServerSession(authOptions);
  if (!session) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const sessionUser = session.user as any;
  const currentUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      organizationId: true,
      organization: { select: { id: true, name: true } },
      mustChangePassword: true,
    },
  });
  if (!currentUser || currentUser.status !== "ACTIVE") return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  let activeOrganization = currentUser.organization;
  if (currentUser.role === "SUPER_ADMIN" && sessionUser.organizationId && sessionUser.organizationId !== currentUser.organizationId) {
    const selectedOrganization = await prisma.organization.findUnique({
      where: { id: String(sessionUser.organizationId) },
      select: { id: true, name: true },
    });
    if (selectedOrganization) activeOrganization = selectedOrganization;
  }
  const user = {
    id: currentUser.id,
    name: currentUser.name,
    email: currentUser.email,
    role: currentUser.role,
    organizationId: activeOrganization.id,
    organizationName: activeOrganization.name,
    mustChangePassword: currentUser.mustChangePassword,
  };
  return { user };
}

export async function requirePermission(permission: Permission): Promise<AccessResult> {
  const access = await requireCurrentUser();
  if (access.response) return access;
  const user = access.user!;
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

import type { Prisma } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { logAuditEvent } from "./operational-logging";
import { prisma } from "./prisma";

export const auditLogFields = {
  action: true,
  resourceType: true,
  resourceId: true,
  userId: true,
  reason: true,
  createdAt: true,
} as const satisfies Prisma.AuditEventSelect;

export async function recordAuditEvent(data: Prisma.AuditEventUncheckedCreateInput) {
  const savedEvent = await prisma.auditEvent.create({ data, select: auditLogFields });
  await mirrorAuditEvent(savedEvent);
}

/** Call after the database write or transaction has committed. */
export async function mirrorAuditEvent(event: Prisma.AuditEventGetPayload<{ select: typeof auditLogFields }>) {
  const delivery = logAuditEvent(event);
  if (process.env.VERCEL === "1") {
    waitUntil(delivery);
    return;
  }
  await delivery;
}

import { DiagnosticOrderStatus, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";
import { canTransitionDiagnosticOrder, DiagnosticState } from "@/lib/domain/diagnostics";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json(); const desired = String(body.status || "") as DiagnosticState;
  const access = await requirePermission(desired === "REVIEWED" ? "result:review" : "order:create"); if (access.response) return access.response;
  const order = await prisma.diagnosticOrder.findFirst({ where: { id: params.id, organizationId: access.user.organizationId } }); if (!order) return NextResponse.json({ error: "Diagnostic order not found." }, { status: 404 });
  if (!canTransitionDiagnosticOrder(order.status as DiagnosticState, desired)) return NextResponse.json({ error: `Cannot change order from ${order.status} to ${desired}.` }, { status: 409 });
  const reason = String(body.reason || "").trim(); if (desired === "CANCELLED" && !reason) return NextResponse.json({ error: "Cancellation reason is required." }, { status: 400 });
  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null; if (desired === "SCHEDULED" && (!scheduledAt || Number.isNaN(scheduledAt.getTime()))) return NextResponse.json({ error: "A valid schedule date and time are required." }, { status: 400 });
  const resultSummary = String(body.resultSummary || "").trim().slice(0, 10_000) || null;
  const hasReport = desired === "COMPLETED" && !resultSummary ? await prisma.storedDocument.count({ where: { organizationId: access.user.organizationId, diagnosticOrderId: order.id, deletedAt: null } }) > 0 : false;
  if (desired === "COMPLETED" && !resultSummary && !hasReport) return NextResponse.json({ error: "Result summary or associated report is required." }, { status: 400 });
  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      const changed = await tx.diagnosticOrder.updateMany({ where: { id: order.id, organizationId: access.user.organizationId, status: order.status }, data: { status: desired as DiagnosticOrderStatus, resultSummary: resultSummary ?? order.resultSummary, reviewedAt: desired === "REVIEWED" ? new Date() : undefined, reviewedById: desired === "REVIEWED" ? access.user.id : undefined, scheduledAt: scheduledAt || undefined } });
      if (changed.count !== 1) throw new Error("ORDER_CHANGED");
      await tx.diagnosticOrderStatusHistory.create({ data: { orderId: order.id, previousStatus: order.status, newStatus: desired as DiagnosticOrderStatus, reason: reason || null, changedById: access.user.id } });
      return tx.diagnosticOrder.findUniqueOrThrow({ where: { id: order.id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_CHANGED" || error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "Order changed while updating. Refresh and try again." }, { status: 409 });
    throw error;
  }
  await audit({ organizationId: access.user.organizationId, userId: access.user.id, patientId: order.patientId, action: desired === "REVIEWED" ? "DIAGNOSTIC_RESULT_REVIEWED" : "DIAGNOSTIC_ORDER_UPDATED", resourceType: "DiagnosticOrder", resourceId: order.id, newValue: { status: desired }, reason: reason || undefined, request });
  return NextResponse.json(updated);
}

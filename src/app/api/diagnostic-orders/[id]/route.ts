import { DiagnosticOrderStatus, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";
import { canTransitionDiagnosticOrder, DiagnosticState } from "@/lib/domain/diagnostics";
import { exactlyOneObservationValue, interpretNumericObservation } from "@/lib/domain/observations";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json(); const desired = String(body.status || "") as DiagnosticState;
  const access = await requirePermission(desired === "REVIEWED" ? "result:review" : "order:create"); if (access.response) return access.response;
  const order = await prisma.diagnosticOrder.findFirst({ where: { id: params.id, organizationId: access.user.organizationId } }); if (!order) return NextResponse.json({ error: "Diagnostic order not found." }, { status: 404 });
  if (!canTransitionDiagnosticOrder(order.status as DiagnosticState, desired)) return NextResponse.json({ error: `Cannot change order from ${order.status} to ${desired}.` }, { status: 409 });
  const reason = String(body.reason || "").trim(); if (desired === "CANCELLED" && !reason) return NextResponse.json({ error: "Cancellation reason is required." }, { status: 400 });
  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null; if (desired === "SCHEDULED" && (!scheduledAt || Number.isNaN(scheduledAt.getTime()))) return NextResponse.json({ error: "A valid schedule date and time are required." }, { status: 400 });
  const resultSummary = String(body.resultSummary || "").trim().slice(0, 10_000) || null;
  const rawObservations = desired === "COMPLETED" && Array.isArray(body.observations) ? body.observations : [];
  const observations = rawObservations.map((item: any) => normalizeObservation(item));
  if (observations.some((item: { error?: string }) => item.error)) return NextResponse.json({ error: observations.find((item: { error?: string }) => item.error)?.error }, { status: 400 });
  const hasReport = desired === "COMPLETED" && !resultSummary && !observations.length ? await prisma.storedDocument.count({ where: { organizationId: access.user.organizationId, diagnosticOrderId: order.id, deletedAt: null } }) > 0 : false;
  if (desired === "COMPLETED" && !resultSummary && !observations.length && !hasReport) return NextResponse.json({ error: "A structured result, result summary, or associated report is required." }, { status: 400 });
  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      const changed = await tx.diagnosticOrder.updateMany({ where: { id: order.id, organizationId: access.user.organizationId, status: order.status }, data: { status: desired as DiagnosticOrderStatus, resultSummary: resultSummary ?? order.resultSummary, reviewedAt: desired === "REVIEWED" ? new Date() : undefined, reviewedById: desired === "REVIEWED" ? access.user.id : undefined, scheduledAt: scheduledAt || undefined } });
      if (changed.count !== 1) throw new Error("ORDER_CHANGED");
      if (desired === "COMPLETED" && observations.length) await tx.diagnosticObservation.createMany({ data: observations.map((item: { data?: any }) => ({ ...item.data!, organizationId: order.organizationId, orderId: order.id, patientId: order.patientId })) });
      if (desired === "REVIEWED") await tx.diagnosticObservation.updateMany({ where: { orderId: order.id, status: { notIn: ["CANCELLED", "ENTERED_IN_ERROR"] } }, data: { reviewedAt: new Date(), reviewedById: access.user.id } });
      await tx.diagnosticOrderStatusHistory.create({ data: { orderId: order.id, previousStatus: order.status, newStatus: desired as DiagnosticOrderStatus, reason: reason || null, changedById: access.user.id } });
      return tx.diagnosticOrder.findUniqueOrThrow({ where: { id: order.id }, include: { observations: { orderBy: { createdAt: "asc" } } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_CHANGED" || error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "Order changed while updating. Refresh and try again." }, { status: 409 });
    throw error;
  }
  await audit({ organizationId: access.user.organizationId, userId: access.user.id, patientId: order.patientId, action: desired === "REVIEWED" ? "DIAGNOSTIC_RESULT_REVIEWED" : "DIAGNOSTIC_ORDER_UPDATED", resourceType: "DiagnosticOrder", resourceId: order.id, newValue: { status: desired }, reason: reason || undefined, request });
  return NextResponse.json(updated);
}

function normalizeObservation(item: any): { error?: string; data?: any } {
  const display = String(item.display || "").trim().slice(0, 500); if (!display) return { error: "Each structured result needs a test/component name." };
  const valueType = String(item.valueType || "NUMBER").toUpperCase();
  const valueNumber = valueType === "NUMBER" && item.value !== "" ? Number(item.value) : undefined;
  const valueText = valueType === "TEXT" ? String(item.value || "").trim().slice(0, 2000) : undefined;
  const valueBoolean = valueType === "BOOLEAN" ? item.value === true || item.value === "true" : undefined;
  if (!exactlyOneObservationValue({ valueNumber, valueText, valueBoolean })) return { error: `${display} must have exactly one valid result value.` };
  const referenceLow = finiteOrNull(item.referenceLow), referenceHigh = finiteOrNull(item.referenceHigh), criticalLow = finiteOrNull(item.criticalLow), criticalHigh = finiteOrNull(item.criticalHigh);
  if (referenceLow != null && referenceHigh != null && referenceLow > referenceHigh) return { error: `${display} has an invalid reference range.` };
  const derived = valueNumber != null ? interpretNumericObservation({ value: valueNumber, referenceLow, referenceHigh, criticalLow, criticalHigh }) : { interpretation: String(item.interpretation || "INDETERMINATE"), isCritical: Boolean(item.isCritical) };
  const validInterpretations = ["NORMAL", "ABNORMAL", "HIGH", "LOW", "CRITICAL_HIGH", "CRITICAL_LOW", "POSITIVE", "NEGATIVE", "INDETERMINATE"];
  if (!validInterpretations.includes(derived.interpretation)) return { error: `${display} has an invalid interpretation.` };
  return { data: { display, code: textOrNull(item.code, 200), codingSystem: textOrNull(item.codingSystem, 500), valueNumber: valueNumber ?? null, valueText: valueText || null, valueBoolean: valueBoolean ?? null, unit: textOrNull(item.unit, 100), unitCode: textOrNull(item.unitCode, 100), referenceLow, referenceHigh, referenceText: textOrNull(item.referenceText, 500), interpretation: derived.interpretation, isCritical: derived.isCritical, status: "FINAL", observedAt: item.observedAt && !Number.isNaN(new Date(item.observedAt).getTime()) ? new Date(item.observedAt) : new Date(), specimenType: textOrNull(item.specimenType, 200), method: textOrNull(item.method, 200), verifiedAt: new Date(), verifiedById: null } };
}
function finiteOrNull(value: unknown) { if (value === "" || value == null) return null; const number = Number(value); return Number.isFinite(number) ? number : null; }
function textOrNull(value: unknown, max: number) { const text = String(value || "").trim(); return text ? text.slice(0, max) : null; }

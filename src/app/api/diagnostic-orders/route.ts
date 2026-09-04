import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";
import { canCreateOperationalDiagnosticOrder } from "@/lib/domain/diagnostics";

export async function GET(request: NextRequest) {
  const access = await requirePermission("patient:read"); if (access.response) return access.response;
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1), pageSize = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("pageSize")) || 25));
  const type = request.nextUrl.searchParams.get("type"), status = request.nextUrl.searchParams.get("status"), patientId = request.nextUrl.searchParams.get("patientId"), visitId = request.nextUrl.searchParams.get("visitId");
  const where: any = { organizationId: access.user.organizationId, ...(type ? { type } : {}), ...(status ? { status } : {}), ...(patientId ? { patientId } : {}), ...(visitId ? { visitId } : {}) };
  const [orders, total, organization] = await prisma.$transaction([prisma.diagnosticOrder.findMany({ where, include: { patient: { select: { id: true, mrn: true, name: true } }, orderingPractitioner: { select: { id: true, name: true } }, documents: { where: { deletedAt: null }, select: { id: true, originalName: true, contentType: true, sizeBytes: true, createdAt: true }, orderBy: { createdAt: "desc" } }, observations: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }), prisma.diagnosticOrder.count({ where }), prisma.organization.findUnique({ where: { id: access.user.organizationId }, select: { operationalDiagnosticOrdersEnabled: true } })]);
  return NextResponse.json({ page, pageSize, total, orders, operationalDiagnosticOrdersEnabled: organization?.operationalDiagnosticOrdersEnabled ?? false });
}

export async function POST(request: NextRequest) {
  const access = await requirePermission("order:create"); if (access.response) return access.response;
  const body = await request.json(), organizationId = access.user.organizationId;
  if (!["LABORATORY", "IMAGING"].includes(body.type) || !["ROUTINE", "URGENT", "STAT"].includes(body.priority || "ROUTINE") || !String(body.procedureName || "").trim()) return NextResponse.json({ error: "Valid order type, priority, and procedure name are required." }, { status: 400 });
  const [visit, organization] = await Promise.all([
    prisma.visit.findFirst({ where: { id: body.visitId, patient: { organizationId } }, include: { patient: { select: { id: true } } } }),
    prisma.organization.findUnique({ where: { id: organizationId }, select: { operationalDiagnosticOrdersEnabled: true } }),
  ]);
  if (!visit) return NextResponse.json({ error: "Encounter not found." }, { status: 404 });
  const policy = canCreateOperationalDiagnosticOrder(organization?.operationalDiagnosticOrdersEnabled ?? false, visit.signedAt);
  if (!policy.allowed && policy.code === "DIAGNOSTIC_ORDERS_DISABLED") return NextResponse.json({ error: "Operational diagnostic orders are disabled for this hospital.", code: policy.code }, { status: 403 });
  if (!policy.allowed) return NextResponse.json({ error: "Finalized encounters require an amendment before adding orders.", code: policy.code }, { status: 409 });
  const orderingPractitionerId = access.user.role === "DOCTOR" ? access.user.id : body.orderingPractitionerId;
  const practitioner = await prisma.user.findFirst({ where: { id: orderingPractitionerId, organizationId, role: "DOCTOR", status: "ACTIVE" }, include: { practitionerProfile: { select: { clinicId: true } } } }); if (!practitioner) return NextResponse.json({ error: "Active ordering practitioner is required." }, { status: 400 });
  const clinicId = body.clinicId || practitioner.practitionerProfile?.clinicId;
  const clinic = clinicId ? await prisma.clinicLocation.findFirst({ where: { id: clinicId, organizationId, active: true } }) : null; if (clinicId && !clinic) return NextResponse.json({ error: "Clinic not found." }, { status: 404 });
  const orderNumber = `DO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(4).toString("hex").toUpperCase()}`;
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.diagnosticOrder.create({ data: { organizationId, clinicId: clinic?.id || null, patientId: visit.patient.id, visitId: visit.id, orderingPractitionerId: practitioner.id, orderNumber, accessionNumber: String(body.accessionNumber || "").trim() || null, type: body.type, procedureCode: String(body.procedureCode || "").trim() || null, procedureName: String(body.procedureName).trim().slice(0, 500), clinicalIndication: String(body.clinicalIndication || "").trim().slice(0, 2000) || null, priority: body.priority || "ROUTINE", scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null } });
    await tx.diagnosticOrderStatusHistory.create({ data: { orderId: created.id, newStatus: "CREATED", changedById: access.user.id } }); return created;
  });
  await audit({ organizationId, userId: access.user.id, patientId: visit.patient.id, action: "DIAGNOSTIC_ORDER_CREATED", resourceType: "DiagnosticOrder", resourceId: order.id, newValue: { orderNumber, type: body.type, priority: body.priority || "ROUTINE" }, request });
  return NextResponse.json(order, { status: 201 });
}

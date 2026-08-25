import { createHash, randomBytes } from "crypto";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { documentStorage, malwareScanner } from "@/lib/document-storage";
import { audit, requirePermission, roleHasPermission } from "@/lib/security";

export const runtime = "nodejs";
const allowedTypes: Record<string, string[]> = { "application/pdf": [".pdf"], "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"] };
function matchesSignature(bytes: Uint8Array, contentType: string) {
  if (contentType === "application/pdf") return Buffer.from(bytes.subarray(0, 5)).toString() === "%PDF-";
  if (contentType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png") return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  return false;
}

export async function GET(request: NextRequest) {
  const access = await requirePermission("patient:read"); if (access.response) return access.response;
  const patientId = request.nextUrl.searchParams.get("patientId") || "";
  const patient = await prisma.patient.findFirst({ where: { id: patientId, organizationId: access.user.organizationId } }); if (!patient) return NextResponse.json({ error: "Patient not found." }, { status: 404 });
  return NextResponse.json(await prisma.storedDocument.findMany({ where: { organizationId: access.user.organizationId, patientId, deletedAt: null }, select: { id: true, originalName: true, contentType: true, sizeBytes: true, visitId: true, diagnosticOrderId: true, createdAt: true }, orderBy: { createdAt: "desc" } }));
}

export async function POST(request: NextRequest) {
  const access = await requirePermission("document:upload"); if (access.response) return access.response;
  const data = await request.formData(), file = data.get("file"); if (!(file instanceof File)) return NextResponse.json({ error: "Choose a document to upload." }, { status: 400 });
  const maxBytes = Math.min(25 * 1024 * 1024, Number(process.env.MAX_DOCUMENT_BYTES) || 10 * 1024 * 1024), extension = path.extname(file.name).toLowerCase();
  if (!allowedTypes[file.type]?.includes(extension) || file.size <= 0 || file.size > maxBytes) return NextResponse.json({ error: "Only PDF, JPEG, and PNG files within the configured size limit are allowed." }, { status: 400 });
  const organizationId = access.user.organizationId, patientId = String(data.get("patientId") || ""), visitId = String(data.get("visitId") || "") || null, diagnosticOrderId = String(data.get("diagnosticOrderId") || "") || null;
  const finalizeDiagnosticOrder = data.get("finalizeDiagnosticOrder") === "true";
  if (finalizeDiagnosticOrder && (!diagnosticOrderId || !roleHasPermission(access.user.role, "order:create"))) return NextResponse.json({ error: "You cannot submit results for this diagnostic order." }, { status: 403 });
  const patient = await prisma.patient.findFirst({ where: { id: patientId, organizationId } }); if (!patient) return NextResponse.json({ error: "Patient not found." }, { status: 404 });
  if (visitId && !(await prisma.visit.findFirst({ where: { id: visitId, patientId, patient: { organizationId } } }))) return NextResponse.json({ error: "Encounter not found." }, { status: 404 });
  const diagnosticOrder = diagnosticOrderId ? await prisma.diagnosticOrder.findFirst({ where: { id: diagnosticOrderId, patientId, organizationId } }) : null;
  if (diagnosticOrderId && !diagnosticOrder) return NextResponse.json({ error: "Diagnostic order not found." }, { status: 404 });
  if (finalizeDiagnosticOrder && diagnosticOrder?.status !== "IN_PROGRESS") return NextResponse.json({ error: "Only an in-progress diagnostic order can receive a final report." }, { status: 409 });
  const bytes = new Uint8Array(await file.arrayBuffer()); if (!matchesSignature(bytes, file.type)) return NextResponse.json({ error: "File contents do not match the declared document type." }, { status: 400 });
  const scan = await malwareScanner.scan(bytes, file.type); if (!scan.safe) return NextResponse.json({ error: "Document failed the security scan." }, { status: 422 });
  const storageKey = randomBytes(24).toString("hex"), checksumSha256 = createHash("sha256").update(bytes).digest("hex"); await documentStorage.put(storageKey, bytes);
  const document = await prisma.$transaction(async (tx) => {
    const created = await tx.storedDocument.create({ data: { organizationId, patientId, visitId, diagnosticOrderId, originalName: path.basename(file.name).slice(0, 255), contentType: file.type, sizeBytes: file.size, storageKey, checksumSha256, uploadedById: access.user.id } });
    if (finalizeDiagnosticOrder && diagnosticOrder) {
      const changed = await tx.diagnosticOrder.updateMany({ where: { id: diagnosticOrder.id, organizationId, status: "IN_PROGRESS" }, data: { status: "COMPLETED" } });
      if (changed.count !== 1) throw new Error("DIAGNOSTIC_ORDER_CHANGED");
      await tx.diagnosticOrderStatusHistory.create({ data: { orderId: diagnosticOrder.id, previousStatus: "IN_PROGRESS", newStatus: "COMPLETED", reason: "Final report uploaded", changedById: access.user.id } });
    }
    return created;
  });
  await audit({ organizationId, userId: access.user.id, patientId, action: "DOCUMENT_UPLOADED", resourceType: "StoredDocument", resourceId: document.id, newValue: { contentType: file.type, sizeBytes: file.size }, request });
  if (finalizeDiagnosticOrder && diagnosticOrder) await audit({ organizationId, userId: access.user.id, patientId, action: "DIAGNOSTIC_REPORT_UPLOADED", resourceType: "DiagnosticOrder", resourceId: diagnosticOrder.id, newValue: { status: "COMPLETED", documentId: document.id }, request });
  return NextResponse.json({ id: document.id, originalName: document.originalName, contentType: document.contentType, sizeBytes: document.sizeBytes, createdAt: document.createdAt, orderStatus: finalizeDiagnosticOrder ? "COMPLETED" : undefined }, { status: 201 });
}

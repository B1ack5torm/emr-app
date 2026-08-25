import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { documentStorage } from "@/lib/document-storage";
import { audit, requirePermission } from "@/lib/security";
import { createHash } from "crypto";

export const runtime = "nodejs";
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requirePermission("patient:read"); if (access.response) return access.response;
  const document = await prisma.storedDocument.findFirst({ where: { id: params.id, organizationId: access.user.organizationId, deletedAt: null } }); if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  const bytes = await documentStorage.get(document.storageKey);
  const checksum = createHash("sha256").update(bytes).digest("hex");
  if (checksum !== document.checksumSha256) {
    await audit({ organizationId: access.user.organizationId, userId: access.user.id, patientId: document.patientId, action: "DOCUMENT_INTEGRITY_FAILED", resourceType: "StoredDocument", resourceId: document.id, request });
    return NextResponse.json({ error: "Document integrity validation failed." }, { status: 500 });
  }
  await audit({ organizationId: access.user.organizationId, userId: access.user.id, patientId: document.patientId, action: "DOCUMENT_DOWNLOADED", resourceType: "StoredDocument", resourceId: document.id, request });
  const safeName = document.originalName.replace(/[\r\n"\\]/g, "_");
  const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const disposition = request.nextUrl.searchParams.get("inline") === "1" ? "inline" : "attachment";
  return new NextResponse(body, { headers: { "Content-Type": document.contentType, "Content-Length": String(document.sizeBytes), "Content-Disposition": `${disposition}; filename="${safeName}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}

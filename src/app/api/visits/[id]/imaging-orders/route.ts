import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildORM } from "@/lib/hl7";
import { sendHL7ViaMLLP } from "@/lib/mllp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["DOCTOR", "ADMIN"].includes((session.user as any).role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const organizationId = (session.user as any).organizationId;
  const visit = await prisma.visit.findUnique({ where: { id: params.id }, include: { patient: true } });
  if (!visit || visit.patient.organizationId !== organizationId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { modality, procedureDescription, bodyPart } = await req.json();
  if (!modality || !procedureDescription) {
    return NextResponse.json({ error: "Modality and procedure description are required." }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  const accessionNumber = `ACC${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;

  const order = await prisma.imagingOrder.create({
    data: { accessionNumber, modality, procedureDescription, bodyPart, visitId: visit.id, status: "ORDERED" },
  });

  const hl7Message = buildORM({ order, patient: visit.patient, orgName: org!.name });

  const host = process.env.MLLP_HOST;
  const port = Number(process.env.MLLP_PORT || 0);

  if (!host || !port) {
    const failed = await prisma.imagingOrder.update({
      where: { id: order.id },
      data: { status: "FAILED", hl7Sent: hl7Message, errorMessage: "MLLP_HOST / MLLP_PORT not configured." },
    });
    return NextResponse.json({ order: failed, warning: "Order saved, but no MLLP endpoint is configured." }, { status: 201 });
  }

  try {
    const ack = await sendHL7ViaMLLP(host, port, hl7Message);
    const isAckOk = /MSA\|AA/i.test(ack);
    const updated = await prisma.imagingOrder.update({
      where: { id: order.id },
      data: { status: isAckOk ? "ACK_OK" : "ACK_ERROR", hl7Sent: hl7Message, hl7AckReceived: ack, sentAt: new Date() },
    });
    return NextResponse.json({ order: updated }, { status: 201 });
  } catch (e: any) {
    const failed = await prisma.imagingOrder.update({
      where: { id: order.id },
      data: { status: "FAILED", hl7Sent: hl7Message, errorMessage: e.message },
    });
    return NextResponse.json({ order: failed, error: "Could not deliver HL7 order: " + e.message }, { status: 502 });
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const organizationId = (session.user as any).organizationId;

  const visit = await prisma.visit.findUnique({ where: { id: params.id }, include: { patient: true } });
  if (!visit || visit.patient.organizationId !== organizationId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const orders = await prisma.imagingOrder.findMany({ where: { visitId: params.id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(orders);
}
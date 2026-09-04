import { NextRequest, NextResponse } from "next/server";
import type { ImagingModality } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildORM } from "@/lib/hl7";
import { parseAck, sendHL7ViaMLLP } from "@/lib/mllp";
import { canCreateOperationalImagingOrder, imagingOrderStatusForAck, isActiveImagingOrderEncounter, newAccessionNumber, newMessageControlId, validateImagingOrderInput } from "@/lib/domain/imaging-orders";
import { audit, requirePermission } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function configuredTimeout(name: string, fallback: number) {
  const value = Number(process.env[name] || fallback);
  return Number.isFinite(value) && value >= 100 && value <= 120_000 ? value : fallback;
}

function operationalError(reason: unknown) {
  return (reason instanceof Error ? reason.message : "Unknown MLLP transmission failure.").slice(0, 2000);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requirePermission("order:create");
  if (access.response) return access.response;
  const user = access.user;

  const visit = await prisma.visit.findFirst({
    where: { id: params.id, patient: { organizationId: user.organizationId } },
    include: { patient: true, doctor: { select: { id: true, name: true } } },
  });
  if (!visit) return NextResponse.json({ error: "Encounter not found." }, { status: 404 });
  const organization = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { operationalImagingOrdersEnabled: true },
  });
  const policy = canCreateOperationalImagingOrder(organization?.operationalImagingOrdersEnabled === true);
  if (!policy.allowed) return NextResponse.json({ error: "Operational imaging orders are disabled for this hospital.", code: policy.code }, { status: 403 });
  if (!isActiveImagingOrderEncounter(visit.status)) return NextResponse.json({ error: "Imaging orders can only be placed from an active encounter." }, { status: 409 });
  if (!visit.patient.dateOfBirth) return NextResponse.json({ error: "Review the patient details and record a date of birth before placing an imaging order." }, { status: 409 });

  let requestBody: unknown;
  try { requestBody = await req.json(); } catch { return NextResponse.json({ error: "A valid JSON order is required." }, { status: 400 }); }
  const validated = validateImagingOrderInput(requestBody);
  if ("error" in validated) return NextResponse.json({ error: validated.error }, { status: 400 });

  const accessionNumber = newAccessionNumber();
  const messageControlId = newMessageControlId();
  const order = await prisma.imagingOrder.create({
    data: {
      accessionNumber,
      messageControlId,
      modality: validated.data.modality as ImagingModality,
      procedureCode: validated.data.procedureCode,
      procedureDescription: validated.data.procedureDescription,
      bodyPart: validated.data.bodyPart,
      clinicalIndication: validated.data.clinicalIndication,
      visitId: visit.id,
      status: "ORDERED",
    },
  });
  await audit({
    organizationId: user.organizationId,
    userId: user.id,
    patientId: visit.patientId,
    action: "IMAGING_ORDER_PLACED",
    resourceType: "ImagingOrder",
    resourceId: order.id,
    newValue: { accessionNumber, messageControlId, modality: order.modality, status: order.status },
    request: req,
  });

  const provider = visit.doctor || { id: user.id, name: user.name };
  const hl7Message = buildORM({
    order,
    patient: { ...visit.patient, dateOfBirth: visit.patient.dateOfBirth },
    encounter: { id: visit.id, providerId: provider.id, providerName: provider.name },
    sender: { application: process.env.HL7_SENDER_APPLICATION || "CARECHART", facility: process.env.HL7_SENDER_FACILITY || user.organizationName },
    receiver: { application: process.env.HL7_RECEIVER_APPLICATION || "IMAGING", facility: process.env.HL7_RECEIVER_FACILITY || "MWL" },
    stationAeTitle: process.env.MWL_STATION_AETITLE,
  });

  const host = process.env.MLLP_HOST;
  const port = Number(process.env.MLLP_PORT || 0);
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
    const errorMessage = "MLLP_HOST / MLLP_PORT not configured.";
    const failed = await prisma.imagingOrder.update({ where: { id: order.id }, data: { status: "FAILED", hl7Sent: hl7Message, errorMessage } });
    await audit({ organizationId: user.organizationId, userId: user.id, patientId: visit.patientId, action: "IMAGING_ORDER_TRANSMISSION_FAILED", resourceType: "ImagingOrder", resourceId: order.id, newValue: { status: "FAILED", accepted: false }, reason: errorMessage, request: req });
    return NextResponse.json({ order: failed, warning: "Order saved, but no MLLP endpoint is configured." }, { status: 201 });
  }

  const transmission: { sentAt: Date | null } = { sentAt: null };
  let rawAck: string | null = null;
  try {
    rawAck = await sendHL7ViaMLLP({
      host,
      port,
      message: hl7Message,
      connectionTimeoutMs: configuredTimeout("MLLP_CONNECTION_TIMEOUT_MS", 5_000),
      readTimeoutMs: configuredTimeout("MLLP_READ_TIMEOUT_MS", 10_000),
      onSent: (timestamp) => { transmission.sentAt = timestamp; },
    });
    const ack = parseAck(rawAck, messageControlId);
    const accepted = ack.code === "AA";
    const nextStatus = imagingOrderStatusForAck(ack.code);
    const recordedSentAt = transmission.sentAt || new Date();
    const updated = await prisma.imagingOrder.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
        hl7Sent: hl7Message,
        hl7AckReceived: rawAck,
        ackCode: ack.code,
        ackErrorText: ack.errorText,
        errorMessage: null,
        sentAt: recordedSentAt,
      },
    });
    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      patientId: visit.patientId,
      action: accepted ? "IMAGING_ORDER_ACCEPTED" : "IMAGING_ORDER_REJECTED",
      resourceType: "ImagingOrder",
      resourceId: order.id,
      newValue: { status: updated.status, ackCode: ack.code, accepted, sentAt: recordedSentAt.toISOString() },
      request: req,
    });
    return NextResponse.json({ order: updated }, { status: 201 });
  } catch (reason) {
    const errorMessage = operationalError(reason);
    const failed = await prisma.imagingOrder.update({
      where: { id: order.id },
      data: { status: "FAILED", hl7Sent: hl7Message, hl7AckReceived: rawAck, errorMessage, ...(transmission.sentAt ? { sentAt: transmission.sentAt } : {}) },
    });
    await audit({ organizationId: user.organizationId, userId: user.id, patientId: visit.patientId, action: "IMAGING_ORDER_TRANSMISSION_FAILED", resourceType: "ImagingOrder", resourceId: order.id, newValue: { status: "FAILED", accepted: false, sentAt: transmission.sentAt?.toISOString() || null }, reason: errorMessage, request: req });
    return NextResponse.json({ order: failed, error: errorMessage }, { status: 502 });
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requirePermission("patient:read");
  if (access.response) return access.response;
  const visit = await prisma.visit.findFirst({ where: { id: params.id, patient: { organizationId: access.user.organizationId } }, select: { id: true } });
  if (!visit) return NextResponse.json({ error: "Encounter not found." }, { status: 404 });
  const [orders, organization] = await Promise.all([
    prisma.imagingOrder.findMany({ where: { visitId: visit.id }, orderBy: { createdAt: "desc" } }),
    prisma.organization.findUnique({ where: { id: access.user.organizationId }, select: { operationalImagingOrdersEnabled: true } }),
  ]);
  return NextResponse.json({ orders, operationalImagingOrdersEnabled: organization?.operationalImagingOrdersEnabled === true });
}

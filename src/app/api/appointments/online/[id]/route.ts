import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requirePermission("appointment:manage");
  if (access.response) return access.response;
  const user = access.user as any;

  const appointment = await prisma.appointmentRequest.findFirst({
    where: { id: params.id, organizationId: user.organizationId },
  });
  if (!appointment) return NextResponse.json({ error: "Online appointment not found." }, { status: 404 });
  if (appointment.status !== "CONFIRMED") return NextResponse.json({ error: "Only confirmed appointments can be checked in." }, { status: 409 });

  const body = await req.json();
  const age = Number(body.age);
  const gender = String(body.gender || "").toUpperCase();
  const existingPatient = await prisma.patient.findFirst({
    where: {
      organizationId: appointment.organizationId,
      name: { equals: appointment.patientName, mode: "insensitive" },
      OR: [
        { email: { equals: appointment.patientEmail, mode: "insensitive" } },
        { phone: appointment.patientPhone },
      ],
    },
  });
  if (!existingPatient && (!Number.isInteger(age) || age < 1 || age > 130 || !["MALE", "FEMALE", "OTHER"].includes(gender))) {
    return NextResponse.json({ error: "Age and gender are required to create this patient record." }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    let patient = existingPatient;
    if (!patient) {
      const lastPatient = await tx.patient.findFirst({ where: { organizationId: appointment.organizationId }, orderBy: { mrn: "desc" }, select: { mrn: true } });
      const nextMrnNumber = Number(lastPatient?.mrn.replace("MRN-", "") || 0) + 1;
      patient = await tx.patient.create({
        data: {
          mrn: `MRN-${String(nextMrnNumber).padStart(6, "0")}`,
          name: appointment.patientName,
          age,
          gender: gender as "MALE" | "FEMALE" | "OTHER",
          phone: appointment.patientPhone,
          email: appointment.patientEmail,
          organizationId: appointment.organizationId,
          createdById: user.id, updatedById: user.id,
        },
      });
    }
    const visit = await tx.visit.create({
      data: { patientId: patient.id, doctorId: appointment.doctorId, chiefComplaint: appointment.reason, status: "WAITING" },
    });
    const updated = await tx.appointmentRequest.update({
      where: { id: appointment.id },
      data: { status: "CHECKED_IN" },
    });
    return { appointment: updated, patient, visit };
  });
  await audit({ organizationId: appointment.organizationId, userId: user.id, patientId: result.patient.id, action: "APPOINTMENT_CHECKED_IN", resourceType: "AppointmentRequest", resourceId: appointment.id, request: req });

  return NextResponse.json(result);
}

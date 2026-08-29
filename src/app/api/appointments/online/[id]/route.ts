import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";
import { calculateBmi, validateVitalRange } from "@/lib/domain/clinical";

function calculateAge(dateOfBirth: Date) {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDifference = today.getMonth() - dateOfBirth.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < dateOfBirth.getDate())) age -= 1;
  return age;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requirePermission("appointment:manage");
  if (access.response) return access.response;
  const user = access.user as any;

  const appointment = await prisma.appointmentRequest.findFirst({
    where: { id: params.id, organizationId: user.organizationId },
  });
  const body = await req.json();
  const action = String(body.action || "check-in");
  const reason = String(body.reason || "").trim();
  if (!appointment) return NextResponse.json({ error: "Online appointment not found." }, { status: 404 });
  if (!["check-in", "cancel", "no-show"].includes(action)) return NextResponse.json({ error: "Unsupported appointment action." }, { status: 400 });
  if (appointment.status !== "CONFIRMED") return NextResponse.json({ error: "Only confirmed appointments can be updated." }, { status: 409 });
  if (action === "cancel" && !reason) return NextResponse.json({ error: "A cancellation reason is required." }, { status: 400 });

  if (action === "cancel" || action === "no-show") {
    const status = action === "cancel" ? "CANCELLED" : "NO_SHOW";
    const updated = await prisma.appointmentRequest.update({
      where: { id: appointment.id },
      data: { status, statusReason: reason || (action === "no-show" ? "Patient did not arrive." : null), respondedAt: new Date() },
    });
    await audit({ organizationId: appointment.organizationId, userId: user.id, action: `ONLINE_APPOINTMENT_${status}`, resourceType: "AppointmentRequest", resourceId: appointment.id, reason: updated.statusReason || undefined, request: req });
    return NextResponse.json({ appointment: updated });
  }

  const dateOfBirthValue = String(body.dateOfBirth || "");
  const dateOfBirth = /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirthValue) ? new Date(`${dateOfBirthValue}T12:00:00`) : null;
  const age = dateOfBirth ? calculateAge(dateOfBirth) : Number.NaN;
  const gender = String(body.gender || "").toUpperCase();
  const optionalNumber = (value: unknown) => value === "" || value == null ? undefined : Number(value);
  const bloodPressure = String(body.vital?.bloodPressure || "").trim();
  const bloodPressureMatch = bloodPressure ? bloodPressure.match(/^(\d{2,3})\s*\/\s*(\d{2,3})$/) : null;
  if (bloodPressure && !bloodPressureMatch) return NextResponse.json({ error: "Enter blood pressure as systolic/diastolic, for example 118/76." }, { status: 400 });
  const providedVital = body.vital && typeof body.vital === "object" ? {
    heightCm: optionalNumber(body.vital.heightCm),
    weightKg: optionalNumber(body.vital.weightKg),
    temperatureC: optionalNumber(body.vital.temperatureC),
    pulseBpm: optionalNumber(body.vital.pulseBpm),
    respiratoryRate: optionalNumber(body.vital.respiratoryRate),
    systolicBp: bloodPressureMatch ? Number(bloodPressureMatch[1]) : undefined,
    diastolicBp: bloodPressureMatch ? Number(bloodPressureMatch[2]) : undefined,
    oxygenSaturation: optionalNumber(body.vital.oxygenSaturation),
  } : null;
  if (providedVital && Object.values(providedVital).some((value) => value != null && !Number.isFinite(value))) {
    return NextResponse.json({ error: "Enter valid numeric vital-sign values." }, { status: 400 });
  }
  const vital = providedVital && Object.values(providedVital).some((value) => value != null) ? providedVital : null;
  if (vital) {
    const rangeError = validateVitalRange(vital);
    if (rangeError) return NextResponse.json({ error: rangeError }, { status: 400 });
  }
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
  if (!dateOfBirth || !Number.isInteger(age) || age < 0 || age > 130 || !["MALE", "FEMALE", "OTHER"].includes(gender)) {
    return NextResponse.json({ error: "A valid date of birth and gender are required." }, { status: 400 });
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
          dateOfBirth,
          gender: gender as "MALE" | "FEMALE" | "OTHER",
          phone: appointment.patientPhone,
          email: appointment.patientEmail,
          organizationId: appointment.organizationId,
          createdById: user.id, updatedById: user.id,
        },
      });
    } else {
      patient = await tx.patient.update({ where: { id: patient.id }, data: { age, dateOfBirth, gender: gender as "MALE" | "FEMALE" | "OTHER", updatedById: user.id, version: { increment: 1 } } });
    }
    const visit = await tx.visit.create({
      data: {
        patientId: patient.id,
        doctorId: appointment.doctorId,
        chiefComplaint: appointment.reason,
        status: "WAITING",
        bp: vital?.systolicBp != null && vital.diastolicBp != null ? `${vital.systolicBp}/${vital.diastolicBp}` : null,
        temperature: vital?.temperatureC?.toString() || null,
        pulse: vital?.pulseBpm?.toString() || null,
        weight: vital?.weightKg?.toString() || null,
        ...(vital ? { vitals: { create: { ...vital, bmi: calculateBmi(vital.heightCm, vital.weightKg), bmiCalculatedAt: vital.heightCm && vital.weightKg ? new Date() : null, recordedById: user.id } } } : {}),
      },
    });
    const updated = await tx.appointmentRequest.update({
      where: { id: appointment.id },
      data: { status: "CHECKED_IN", statusReason: null },
    });
    return { appointment: updated, patient, visit };
  });
  await audit({ organizationId: appointment.organizationId, userId: user.id, patientId: result.patient.id, action: "APPOINTMENT_CHECKED_IN", resourceType: "AppointmentRequest", resourceId: appointment.id, request: req });

  return NextResponse.json(result);
}

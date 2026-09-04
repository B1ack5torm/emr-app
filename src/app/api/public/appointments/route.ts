import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { slotsOverlap } from "@/lib/domain/appointments";
import { normalizeHospitalSlug } from "@/lib/domain/public-booking";
import { isTimeWithinWorkingPeriods } from "@/lib/domain/scheduling";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const unavailable = () => NextResponse.json({ error: "Online booking is not available for this hospital." }, { status: 404 });

export async function GET(req: NextRequest) {
  const hospitalSlug = normalizeHospitalSlug(req.nextUrl.searchParams.get("hospital"));
  if (!hospitalSlug) return NextResponse.json({ error: "A valid hospital booking link is required." }, { status: 400 });
  const organization = await prisma.organization.findFirst({ where: { slug: hospitalSlug, onlineBookingEnabled: true }, select: { id: true, name: true, slug: true } });
  if (!organization) return unavailable();
  const doctors = await prisma.user.findMany({
    where: { organizationId: organization.id, role: "DOCTOR", status: "ACTIVE", practitionerProfile: { is: { active: true, acceptsOnlineAppointments: true, schedules: { some: { active: true } } } } },
    select: { id: true, name: true, practitionerProfile: { select: { specialty: true, clinic: { select: { id: true, name: true, appointmentTypes: { where: { active: true }, select: { id: true, name: true, durationMinutes: true } } } } } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(doctors.map((doctor) => ({ ...doctor, organization: { name: organization.name, slug: organization.slug } })));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { doctorId, appointmentTypeId, date, time, name, email, phone, reason, privacyAccepted } = body;
  const hospitalSlug = normalizeHospitalSlug(body.hospitalSlug);
  const idempotencyKey = String(req.headers.get("idempotency-key") || "").trim();
  const patientName = String(name || "").trim();
  const patientEmail = String(email || "").trim().toLowerCase();
  const patientPhone = String(phone || "").trim();
  const startsAt = new Date(`${date}T${time}:00`);
  if (!hospitalSlug || !doctorId || !patientName || !patientEmail || !patientPhone || !privacyAccepted || idempotencyKey.length < 16 || idempotencyKey.length > 200 || Number.isNaN(startsAt.getTime()) || !/^\d{2}:\d{2}$/.test(String(time))) {
    return NextResponse.json({ error: "Hospital, doctor, date, time, name, email, and phone are required." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientEmail)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!/^[+\d][\d\s()-]{7,19}$/.test(patientPhone)) return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const latest = new Date(today); latest.setDate(latest.getDate() + 30); latest.setHours(23, 59, 59, 999);
  if (startsAt.getTime() <= Date.now() || startsAt > latest) return NextResponse.json({ error: "That appointment time is not available." }, { status: 400 });

  const organization = await prisma.organization.findFirst({ where: { slug: hospitalSlug, onlineBookingEnabled: true }, select: { id: true } });
  if (!organization) return unavailable();
  const organizationId = organization.id;
  const doctor = await prisma.user.findFirst({
    where: { id: doctorId, organizationId, role: "DOCTOR", status: "ACTIVE", practitionerProfile: { is: { active: true, acceptsOnlineAppointments: true } } },
    select: { id: true, practitionerProfile: { select: { id: true, clinicId: true, defaultAppointmentMinutes: true, schedules: { where: { dayOfWeek: startsAt.getDay(), active: true }, include: { breaks: true } } } } },
  });
  if (!doctor?.practitionerProfile) return NextResponse.json({ error: "Doctor not found." }, { status: 404 });
  if (doctor.practitionerProfile.schedules.length === 0) return NextResponse.json({ error: "That appointment time is outside the practitioner’s configured availability." }, { status: 409 });
  const appointmentType = appointmentTypeId ? await prisma.appointmentType.findFirst({ where: { id: appointmentTypeId, organizationId, clinicId: doctor.practitionerProfile.clinicId, active: true } }) : null;
  if (appointmentTypeId && !appointmentType) return NextResponse.json({ error: "Appointment type not found." }, { status: 404 });
  const durationMinutes = appointmentType?.durationMinutes || doctor.practitionerProfile.defaultAppointmentMinutes;
  const dayStart = new Date(startsAt); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
  const [blocked, holiday] = await Promise.all([
    prisma.blockedPeriod.findMany({ where: { practitionerId: doctor.practitionerProfile.id, startsAt: { lt: new Date(startsAt.getTime() + durationMinutes * 60_000) }, endsAt: { gt: startsAt } }, select: { startsAt: true, endsAt: true } }),
    prisma.holiday.findFirst({ where: { clinicId: doctor.practitionerProfile.clinicId, date: { gte: dayStart, lt: dayEnd } }, select: { id: true } }),
  ]);
  const periods = doctor.practitionerProfile.schedules.map((schedule) => ({ startMinute: schedule.startMinute, endMinute: schedule.endMinute, appointmentMinutes: durationMinutes, slotIntervalMinutes: schedule.appointmentMinutes, breaks: schedule.breaks }));
  if (holiday || !isTimeWithinWorkingPeriods(startsAt, durationMinutes, periods, blocked)) return NextResponse.json({ error: "That appointment time is outside the practitioner’s configured availability." }, { status: 409 });

  const previous = await prisma.appointmentRequest.findUnique({ where: { idempotencyKey }, select: { organizationId: true, doctorId: true, bookingReference: true, status: true } });
  if (previous) {
    if (previous.organizationId !== organizationId || previous.doctorId !== doctorId) return NextResponse.json({ error: "Invalid booking request." }, { status: 409 });
    return NextResponse.json({ bookingReference: previous.bookingReference, status: previous.status, idempotent: true });
  }

  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
  try {
    const appointmentRequest = await prisma.$transaction(async (tx) => {
      const [appointments, requests] = await Promise.all([
        tx.appointment.findMany({ where: { organizationId, doctorId, status: { not: "CANCELLED" }, scheduledAt: { lt: endsAt } }, select: { scheduledAt: true, durationMinutes: true } }),
        tx.appointmentRequest.findMany({ where: { organizationId, doctorId, status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] }, requestedAt: { lt: endsAt } }, select: { requestedAt: true, durationMinutes: true } }),
      ]);
      const hasConflict = appointments.some((item) => slotsOverlap(startsAt, durationMinutes, item.scheduledAt, item.durationMinutes)) || requests.some((item) => slotsOverlap(startsAt, durationMinutes, item.requestedAt, item.durationMinutes));
      if (hasConflict) throw new Error("SLOT_TAKEN");
      return tx.appointmentRequest.create({ data: { doctorId, organizationId, clinicId: doctor.practitionerProfile!.clinicId, appointmentTypeId: appointmentType?.id || null, patientName, patientEmail, patientPhone, reason: String(reason || "").trim().slice(0, 500) || null, requestedAt: startsAt, durationMinutes, status: "CONFIRMED", respondedAt: new Date(), bookingReference: `CC-${new Date().getUTCFullYear()}-${randomBytes(5).toString("hex").toUpperCase()}`, idempotencyKey, privacyAcceptedAt: new Date() } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ bookingReference: appointmentRequest.bookingReference, status: appointmentRequest.status }, { status: 201 });
  } catch (error) {
    if ((error instanceof Error && error.message === "SLOT_TAKEN") || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")) return NextResponse.json({ error: "That time was just requested. Please choose another slot." }, { status: 409 });
    throw error;
  }
}

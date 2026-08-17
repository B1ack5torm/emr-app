import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";

export async function GET(request: NextRequest) {
  const access = await requirePermission("settings:manage"); if (access.response) return access.response;
  const practitionerId = request.nextUrl.searchParams.get("practitionerId") || "";
  const profile = await prisma.practitionerProfile.findFirst({ where: { id: practitionerId, organizationId: access.user.organizationId }, include: { schedules: { include: { breaks: true }, orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }] }, blockedPeriods: { orderBy: { startsAt: "asc" } } } });
  if (!profile) return NextResponse.json({ error: "Practitioner not found." }, { status: 404 });
  return NextResponse.json(profile);
}

export async function POST(request: NextRequest) {
  const access = await requirePermission("settings:manage"); if (access.response) return access.response;
  const body = await request.json(), organizationId = access.user.organizationId;
  if (body.kind === "holiday") {
    const clinic = await prisma.clinicLocation.findFirst({ where: { id: body.clinicId, organizationId } }); if (!clinic) return NextResponse.json({ error: "Clinic not found." }, { status: 404 });
    const date = new Date(`${body.date}T00:00:00.000Z`); if (Number.isNaN(date.getTime()) || !String(body.name || "").trim()) return NextResponse.json({ error: "Valid holiday date and name are required." }, { status: 400 });
    const holiday = await prisma.holiday.create({ data: { organizationId, clinicId: clinic.id, date, name: String(body.name).trim() } });
    await audit({ organizationId, userId: access.user.id, action: "CLINIC_HOLIDAY_CREATED", resourceType: "Holiday", resourceId: holiday.id, request });
    return NextResponse.json(holiday, { status: 201 });
  }
  const profile = await prisma.practitionerProfile.findFirst({ where: { id: body.practitionerId, organizationId } }); if (!profile) return NextResponse.json({ error: "Practitioner not found." }, { status: 404 });
  if (body.kind === "blocked") {
    const startsAt = new Date(body.startsAt), endsAt = new Date(body.endsAt); if (!(startsAt < endsAt) || !String(body.reason || "").trim()) return NextResponse.json({ error: "Valid blocked period and reason are required." }, { status: 400 });
    const blocked = await prisma.blockedPeriod.create({ data: { organizationId, clinicId: profile.clinicId, practitionerId: profile.id, startsAt, endsAt, reason: String(body.reason).trim(), createdById: access.user.id } });
    await audit({ organizationId, userId: access.user.id, action: "PRACTITIONER_TIME_BLOCKED", resourceType: "BlockedPeriod", resourceId: blocked.id, reason: blocked.reason, request });
    return NextResponse.json(blocked, { status: 201 });
  }
  const dayOfWeek = Number(body.dayOfWeek), startMinute = Number(body.startMinute), endMinute = Number(body.endMinute), appointmentMinutes = Number(body.appointmentMinutes) || profile.defaultAppointmentMinutes;
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6 || startMinute < 0 || endMinute > 1440 || startMinute >= endMinute || appointmentMinutes < 5 || appointmentMinutes > 240) return NextResponse.json({ error: "Invalid working hours." }, { status: 400 });
  const breaks = Array.isArray(body.breaks) ? body.breaks.filter((item: any) => Number(item.startMinute) >= startMinute && Number(item.endMinute) <= endMinute && Number(item.startMinute) < Number(item.endMinute)).map((item: any) => ({ startMinute: Number(item.startMinute), endMinute: Number(item.endMinute), label: String(item.label || "").trim() || null })) : [];
  const schedule = await prisma.practitionerSchedule.upsert({ where: { practitionerId_dayOfWeek_startMinute_endMinute: { practitionerId: profile.id, dayOfWeek, startMinute, endMinute } }, update: { appointmentMinutes, active: true, breaks: { deleteMany: {}, create: breaks } }, create: { practitionerId: profile.id, dayOfWeek, startMinute, endMinute, appointmentMinutes, breaks: { create: breaks } }, include: { breaks: true } });
  await audit({ organizationId, userId: access.user.id, action: "SCHEDULE_CONFIGURED", resourceType: "PractitionerSchedule", resourceId: schedule.id, request });
  return NextResponse.json(schedule, { status: 201 });
}

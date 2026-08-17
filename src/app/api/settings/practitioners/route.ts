import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";

export async function GET() {
  const access = await requirePermission("settings:manage"); if (access.response) return access.response;
  return NextResponse.json(await prisma.practitionerProfile.findMany({ where: { organizationId: access.user.organizationId }, include: { user: { select: { id: true, name: true, email: true } }, clinic: true, department: true, schedules: { include: { breaks: true } } }, orderBy: { user: { name: "asc" } } }));
}

export async function POST(request: NextRequest) {
  const access = await requirePermission("settings:manage"); if (access.response) return access.response;
  const body = await request.json(); const organizationId = access.user.organizationId;
  const [doctor, clinic, department] = await Promise.all([
    prisma.user.findFirst({ where: { id: body.userId, organizationId, role: "DOCTOR", status: "ACTIVE" } }),
    prisma.clinicLocation.findFirst({ where: { id: body.clinicId, organizationId, active: true } }),
    body.departmentId ? prisma.department.findFirst({ where: { id: body.departmentId, organizationId, clinicId: body.clinicId, active: true } }) : null,
  ]);
  if (!doctor || !clinic || (body.departmentId && !department)) return NextResponse.json({ error: "Valid active doctor, clinic, and department are required." }, { status: 400 });
  const specialty = String(body.specialty || "").trim(); if (!specialty) return NextResponse.json({ error: "Specialty is required." }, { status: 400 });
  const profile = await prisma.practitionerProfile.upsert({ where: { userId: doctor.id }, update: { clinicId: clinic.id, departmentId: department?.id || null, specialty, qualification: String(body.qualification || "").trim() || null, registrationNumber: String(body.registrationNumber || "").trim() || null, defaultAppointmentMinutes: Math.max(5, Math.min(240, Number(body.defaultAppointmentMinutes) || 30)), active: true }, create: { organizationId, userId: doctor.id, clinicId: clinic.id, departmentId: department?.id || null, specialty, qualification: String(body.qualification || "").trim() || null, registrationNumber: String(body.registrationNumber || "").trim() || null, defaultAppointmentMinutes: Math.max(5, Math.min(240, Number(body.defaultAppointmentMinutes) || 30)) } });
  await audit({ organizationId, userId: access.user.id, action: "PRACTITIONER_CONFIGURED", resourceType: "PractitionerProfile", resourceId: profile.id, request });
  return NextResponse.json(profile, { status: 201 });
}

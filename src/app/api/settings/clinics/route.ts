import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";

export async function GET() {
  const access = await requirePermission("settings:manage"); if (access.response) return access.response;
  const clinics = await prisma.clinicLocation.findMany({ where: { organizationId: access.user.organizationId }, include: { departments: true, appointmentTypes: true }, orderBy: { name: "asc" } });
  return NextResponse.json(clinics);
}

export async function POST(request: NextRequest) {
  const access = await requirePermission("settings:manage"); if (access.response) return access.response;
  const body = await request.json();
  if (["department", "appointmentType"].includes(body.kind)) {
    const clinic = await prisma.clinicLocation.findFirst({ where: { id: body.clinicId, organizationId: access.user.organizationId } }); if (!clinic) return NextResponse.json({ error: "Clinic not found." }, { status: 404 });
    const childName = String(body.name || "").trim(); if (!childName) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    if (body.kind === "department") {
      const department = await prisma.department.create({ data: { organizationId: access.user.organizationId, clinicId: clinic.id, name: childName } });
      await audit({ organizationId: access.user.organizationId, userId: access.user.id, action: "DEPARTMENT_CREATED", resourceType: "Department", resourceId: department.id, request });
      return NextResponse.json(department, { status: 201 });
    }
    const durationMinutes = Number(body.durationMinutes) || 30; if (durationMinutes < 5 || durationMinutes > 240) return NextResponse.json({ error: "Appointment duration must be 5–240 minutes." }, { status: 400 });
    const appointmentType = await prisma.appointmentType.create({ data: { organizationId: access.user.organizationId, clinicId: clinic.id, name: childName, durationMinutes } });
    await audit({ organizationId: access.user.organizationId, userId: access.user.id, action: "APPOINTMENT_TYPE_CREATED", resourceType: "AppointmentType", resourceId: appointmentType.id, request });
    return NextResponse.json(appointmentType, { status: 201 });
  }
  const name = String(body.name || "").trim(), code = String(body.code || "").trim().toUpperCase(), timezone = String(body.timezone || "Asia/Kolkata");
  try { Intl.DateTimeFormat(undefined, { timeZone: timezone }); } catch { return NextResponse.json({ error: "Invalid IANA timezone." }, { status: 400 }); }
  if (!name || !/^[A-Z0-9_-]{2,20}$/.test(code)) return NextResponse.json({ error: "Name and a 2–20 character clinic code are required." }, { status: 400 });
  try {
    const clinic = await prisma.clinicLocation.create({ data: { organizationId: access.user.organizationId, name, code, timezone, address: String(body.address || "").trim() || null, phone: String(body.phone || "").trim() || null } });
    await audit({ organizationId: access.user.organizationId, userId: access.user.id, action: "CLINIC_CREATED", resourceType: "ClinicLocation", resourceId: clinic.id, request });
    return NextResponse.json(clinic, { status: 201 });
  } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "Clinic code already exists." }, { status: 409 }); throw error; }
}

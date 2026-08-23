import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security";
import { normalizePatientEmail, normalizePatientPhone, rankPotentialDuplicates } from "@/lib/domain/patient-identity";

export async function GET(request: NextRequest) {
  const access = await requirePermission("patient:read");
  if (access.response) return access.response;
  const name = String(request.nextUrl.searchParams.get("name") || "").trim();
  const phone = normalizePatientPhone(request.nextUrl.searchParams.get("phone"));
  const email = normalizePatientEmail(request.nextUrl.searchParams.get("email"));
  const dateValue = request.nextUrl.searchParams.get("dateOfBirth");
  const dateOfBirth = dateValue ? new Date(`${dateValue.slice(0, 10)}T00:00:00.000Z`) : null;
  const excludeId = request.nextUrl.searchParams.get("excludeId") || undefined;
  if (!name && !phone && !email && !dateOfBirth) return NextResponse.json({ matches: [] });

  const filters: Prisma.PatientWhereInput[] = [];
  if (name) filters.push({ name: { equals: name, mode: "insensitive" } });
  if (phone) filters.push({ phone });
  if (email) filters.push({ email: { equals: email, mode: "insensitive" } });
  if (dateOfBirth && !Number.isNaN(dateOfBirth.getTime())) filters.push({ dateOfBirth });
  const candidates = await prisma.patient.findMany({
    where: { organizationId: access.user.organizationId, active: true, mergedIntoId: null, ...(excludeId ? { id: { not: excludeId } } : {}), OR: filters },
    select: { id: true, mrn: true, name: true, dateOfBirth: true, phone: true, email: true },
    take: 25,
  });
  return NextResponse.json({ matches: rankPotentialDuplicates({ id: excludeId, name, phone, email, dateOfBirth }, candidates).slice(0, 10) });
}

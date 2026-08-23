import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";
import { normalizePatientEmail, normalizePatientPhone, rankPotentialDuplicates } from "@/lib/domain/patient-identity";

export async function GET(req: NextRequest) {
  const access = await requirePermission("patient:read");
  if (access.response) return access.response;
  const session = { user: access.user } as any;
  const organizationId = (session.user as any).organizationId;
  const isSuperAdmin = (session.user as any).role === "SUPER_ADMIN";

  const q = req.nextUrl.searchParams.get("q") || "";

  const patients = await prisma.patient.findMany({
    where: { ...(isSuperAdmin ? {} : { organizationId }), active: true, mergedIntoId: null, ...(q ? { OR: [{ mrn: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { email: { contains: q, mode: "insensitive" } }, { identifiers: { some: { value: { contains: q, mode: "insensitive" }, active: true } } }] } : {}) },
    include: { allergies: true, identifiers: { where: { active: true } }, visits: { select: { id: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(patients);
}

export async function POST(req: NextRequest) {
  const access = await requirePermission("patient:create");
  if (access.response) return access.response;
  const session = { user: access.user } as any;
  const organizationId = (session.user as any).organizationId;

  const body = await req.json();
  const { name, age, gender, address, bloodGroup, emergencyContact, allergies } = body;
  const phone = normalizePatientPhone(body.phone) || null;
  const email = normalizePatientEmail(body.email) || null;
  const dateOfBirth = body.dateOfBirth ? new Date(`${String(body.dateOfBirth).slice(0, 10)}T00:00:00.000Z`) : null;

  if (!String(name || "").trim() || !Number.isInteger(Number(age)) || Number(age) < 0 || Number(age) > 130 || !["MALE", "FEMALE", "OTHER"].includes(gender)) return NextResponse.json({ error: "A valid name, age, and gender are required." }, { status: 400 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (dateOfBirth && (Number.isNaN(dateOfBirth.getTime()) || dateOfBirth > new Date())) return NextResponse.json({ error: "Enter a valid date of birth." }, { status: 400 });

  const duplicateFilters: Prisma.PatientWhereInput[] = [{ name: { equals: String(name).trim(), mode: "insensitive" } }];
  if (dateOfBirth) duplicateFilters.push({ dateOfBirth });
  if (email) duplicateFilters.push({ email: { equals: email, mode: "insensitive" } });
  if (phone) duplicateFilters.push({ phone });
  const duplicateCandidates = await prisma.patient.findMany({ where: { organizationId, active: true, mergedIntoId: null, OR: duplicateFilters }, select: { id: true, mrn: true, name: true, dateOfBirth: true, phone: true, email: true } });
  const possibleDuplicates = rankPotentialDuplicates({ name, dateOfBirth, phone, email }, duplicateCandidates);
  if (possibleDuplicates.length && body.overrideDuplicate !== true) {
    return NextResponse.json({ error: "A possible matching patient already exists. Review the matches before creating another record.", code: "POSSIBLE_DUPLICATE", matches: possibleDuplicates.slice(0, 5) }, { status: 409 });
  }

  const additionalIdentifiers = (Array.isArray(body.identifiers) ? body.identifiers : []).map((item: any) => ({
    type: String(item.type || "").trim().slice(0, 100), system: String(item.system || "").trim().slice(0, 500), value: String(item.value || "").trim().slice(0, 500), use: String(item.use || "USUAL"), verifiedAt: item.verified ? new Date() : null,
  })).filter((item: any) => item.type && item.system && item.value);
  if (additionalIdentifiers.some((item: any) => !["USUAL", "OFFICIAL", "TEMP", "SECONDARY", "OLD"].includes(item.use))) return NextResponse.json({ error: "Invalid identifier use." }, { status: 400 });
  if (additionalIdentifiers.length) {
    const identifierClash = await prisma.patientIdentifier.findFirst({ where: { organizationId, OR: additionalIdentifiers.map((item: any) => ({ system: item.system, value: item.value })) }, include: { patient: { select: { id: true, mrn: true, name: true } } } });
    if (identifierClash) return NextResponse.json({ error: `Identifier already belongs to ${identifierClash.patient.name} (${identifierClash.patient.mrn}).`, code: "IDENTIFIER_IN_USE", patient: identifierClash.patient }, { status: 409 });
  }

  const existingPatients = await prisma.patient.count({ where: { organizationId } });
  let patient;

  for (let number = existingPatients + 1; number <= existingPatients + 100; number++) {
    const mrn = `MRN-${String(number).padStart(6, "0")}`;
    try {
      patient = await prisma.$transaction(async (tx) => {
        const created = await tx.patient.create({
          data: {
            mrn, name: String(name).trim().slice(0, 500), age: Number(age), gender, phone, email, address: String(address || "").trim() || null, bloodGroup: String(bloodGroup || "").trim() || null, emergencyContact: String(emergencyContact || "").trim() || null, organizationId, createdById: (session.user as any).id, updatedById: (session.user as any).id,
            dateOfBirth,
            allergies: { create: (Array.isArray(allergies) ? allergies : []).filter((value: unknown) => typeof value === "string" && value.trim()).map((value: string) => ({ name: value.trim().slice(0, 500), recordedById: (session.user as any).id })) },
          },
        });
        await tx.patientIdentifier.createMany({ data: [{ organizationId, patientId: created.id, type: "MRN", system: "urn:carechart:mrn", value: mrn, use: "USUAL" }, ...additionalIdentifiers.map((identifier: any) => ({ ...identifier, organizationId, patientId: created.id }))] });
        return tx.patient.findUniqueOrThrow({ where: { id: created.id }, include: { allergies: true, identifiers: true } });
      });
      break;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    }
  }

  if (!patient) return NextResponse.json({ error: "Could not assign a unique MRN. Please try again." }, { status: 503 });
  await audit({ organizationId, userId: (session.user as any).id, patientId: patient.id, action: "PATIENT_CREATED", resourceType: "Patient", resourceId: patient.id, newValue: { mrn: patient.mrn }, request: req });

  return NextResponse.json(patient, { status: 201 });
}

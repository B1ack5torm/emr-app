import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";

const MERGE_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "CLINIC_ADMIN"]);

export async function POST(req: NextRequest) {
  const access = await requirePermission("patient:update");
  if (access.response) return access.response;
  const user = access.user as any;
  if (!MERGE_ROLES.has(user.role)) return NextResponse.json({ error: "Only an administrator can merge patient records." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const sourcePatientId = String(body.sourcePatientId || "");
  const targetPatientId = String(body.targetPatientId || "");
  const reason = String(body.reason || "").trim();
  if (!sourcePatientId || !targetPatientId || sourcePatientId === targetPatientId) return NextResponse.json({ error: "Choose two different patient records." }, { status: 400 });
  if (reason.length < 10) return NextResponse.json({ error: "Document a merge reason of at least 10 characters." }, { status: 400 });

  const scopedOrganizationId = user.organizationId as string;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const [source, target] = await Promise.all([
        tx.patient.findUnique({ where: { id: sourcePatientId }, include: { portalAccount: { select: { id: true } } } }),
        tx.patient.findUnique({ where: { id: targetPatientId }, include: { portalAccount: { select: { id: true } } } }),
      ]);
      if (!source || !target || source.organizationId !== target.organizationId || source.organizationId !== scopedOrganizationId) throw new MergeError("Both patients must belong to your organization.", 404);
      if (!source.active || source.mergedIntoId || !target.active || target.mergedIntoId) throw new MergeError("A merged or inactive record cannot be merged again.", 409);
      if (source.portalAccount && target.portalAccount) throw new MergeError("Both records have portal accounts. Disable or reconcile one portal account before merging.", 409);
      if (body.confirmTargetMrn && body.confirmTargetMrn !== target.mrn) throw new MergeError("The target MRN confirmation does not match.", 409);

      if (source.portalAccount && !target.portalAccount) await tx.patientPortalAccount.update({ where: { patientId: source.id }, data: { patientId: target.id } });

      await Promise.all([
        tx.patientIdentifier.updateMany({ where: { patientId: source.id }, data: { patientId: target.id } }),
        tx.allergy.updateMany({ where: { patientId: source.id }, data: { patientId: target.id } }),
        tx.visit.updateMany({ where: { patientId: source.id }, data: { patientId: target.id } }),
        tx.invoice.updateMany({ where: { patientId: source.id }, data: { patientId: target.id } }),
        tx.appointment.updateMany({ where: { patientId: source.id }, data: { patientId: target.id } }),
        tx.consent.updateMany({ where: { patientId: source.id }, data: { patientId: target.id } }),
        tx.privacyRequest.updateMany({ where: { patientId: source.id }, data: { patientId: target.id } }),
        tx.diagnosticOrder.updateMany({ where: { patientId: source.id }, data: { patientId: target.id } }),
        tx.storedDocument.updateMany({ where: { patientId: source.id }, data: { patientId: target.id } }),
        tx.clinicalProblem.updateMany({ where: { patientId: source.id }, data: { patientId: target.id } }),
        tx.medicationStatement.updateMany({ where: { patientId: source.id }, data: { patientId: target.id } }),
        tx.immunizationRecord.updateMany({ where: { patientId: source.id }, data: { patientId: target.id } }),
        tx.patientProcedure.updateMany({ where: { patientId: source.id }, data: { patientId: target.id } }),
        tx.clinicalFlag.updateMany({ where: { patientId: source.id }, data: { patientId: target.id } }),
        tx.diagnosticObservation.updateMany({ where: { patientId: source.id }, data: { patientId: target.id } }),
        tx.pharmacyOrder.updateMany({ where: { patientId: source.id }, data: { patientId: target.id } }),
        tx.pharmacyInvoice.updateMany({ where: { patientId: source.id }, data: { patientId: target.id } }),
      ]);

      await tx.patientMergeRecord.create({
        data: {
          organizationId: source.organizationId,
          sourcePatientId: source.id,
          targetPatientId: target.id,
          mergedById: user.id,
          reason,
          sourceSnapshot: { mrn: source.mrn, name: source.name, dateOfBirth: source.dateOfBirth, age: source.age, gender: source.gender, phone: source.phone, email: source.email, address: source.address },
        },
      });

      await tx.patient.update({
        where: { id: target.id },
        data: {
          phone: target.phone || source.phone,
          email: target.email || source.email,
          address: target.address || source.address,
          bloodGroup: target.bloodGroup || source.bloodGroup,
          emergencyContact: target.emergencyContact || source.emergencyContact,
          dateOfBirth: target.dateOfBirth || source.dateOfBirth,
          updatedById: user.id,
          version: { increment: 1 },
        },
      });
      await tx.patient.update({ where: { id: source.id }, data: { active: false, mergedIntoId: target.id, updatedById: user.id, version: { increment: 1 } } });
      return tx.patient.findUniqueOrThrow({ where: { id: target.id }, include: { identifiers: { where: { active: true } }, allergies: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    await audit({ organizationId: result.organizationId, userId: user.id, patientId: result.id, action: "PATIENT_RECORDS_MERGED", resourceType: "Patient", resourceId: result.id, reason, newValue: { sourcePatientId, targetPatientId }, request: req });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MergeError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "The records changed during the merge. Please retry." }, { status: 409 });
    throw error;
  }
}

class MergeError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

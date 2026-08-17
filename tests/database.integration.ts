import assert from "node:assert/strict";
import test from "node:test";
import { Prisma, PrismaClient } from "@prisma/client";
import { slotsOverlap } from "../src/lib/domain/appointments";

const prisma = new PrismaClient();
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const orgIds: string[] = [];

test.after(async () => {
  for (const organizationId of orgIds) {
    await prisma.appointment.deleteMany({ where: { organizationId } });
    await prisma.patient.deleteMany({ where: { organizationId } });
    await prisma.user.deleteMany({ where: { organizationId } });
    await prisma.auditEvent.deleteMany({ where: { organizationId } });
    await prisma.organization.delete({ where: { id: organizationId } });
  }
  await prisma.$disconnect();
});

test("tenant scopes deny guessed patient IDs and MRNs are organization-local", async () => {
  const [orgA, orgB] = await Promise.all([
    prisma.organization.create({ data: { name: `Test Clinic A ${suffix}`, slug: `test-a-${suffix}` } }),
    prisma.organization.create({ data: { name: `Test Clinic B ${suffix}`, slug: `test-b-${suffix}` } }),
  ]);
  orgIds.push(orgA.id, orgB.id);
  const patientA = await prisma.patient.create({ data: { organizationId: orgA.id, mrn: "MRN-000001", name: "Fictional Alpha", age: 30, gender: "OTHER" } });
  const patientB = await prisma.patient.create({ data: { organizationId: orgB.id, mrn: "MRN-000001", name: "Fictional Beta", age: 31, gender: "OTHER" } });
  assert.equal((await prisma.patient.findFirst({ where: { id: patientB.id, organizationId: orgA.id } })), null);
  assert.equal(patientA.mrn, patientB.mrn);
  await assert.rejects(prisma.patient.create({ data: { organizationId: orgA.id, mrn: "MRN-000001", name: "Fictional Duplicate", age: 40, gender: "OTHER" } }), (error: any) => error?.code === "P2002");
});

test("serializable reservations prevent concurrent double booking", async () => {
  const organizationId = orgIds[0];
  assert.ok(organizationId);
  const doctor = await prisma.user.create({ data: { organizationId, name: "Dr Fictional", email: `doctor-${suffix}@example.invalid`, passwordHash: "test-only", role: "DOCTOR", status: "ACTIVE" } });
  const patients = await Promise.all([1, 2].map((number) => prisma.patient.create({ data: { organizationId, mrn: `MRN-00000${number + 1}`, name: `Fictional Patient ${number}`, age: 25 + number, gender: "OTHER" } })));
  const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const reserve = (patientId: string) => prisma.$transaction(async (tx) => {
    const existing = await tx.appointment.findMany({ where: { doctorId: doctor.id, status: { notIn: ["CANCELLED", "RESCHEDULED", "NO_SHOW"] }, scheduledAt: { lt: new Date(startsAt.getTime() + 30 * 60_000) } }, select: { scheduledAt: true, durationMinutes: true } });
    if (existing.some((item) => slotsOverlap(startsAt, 30, item.scheduledAt, item.durationMinutes))) throw new Error("SLOT_TAKEN");
    return tx.appointment.create({ data: { organizationId, patientId, doctorId: doctor.id, scheduledAt: startsAt, durationMinutes: 30 } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  const results = await Promise.allSettled(patients.map((patient) => reserve(patient.id)));
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
});

import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const PATIENT_SESSION_COOKIE = "emr_patient_portal";
const SESSION_DAYS = 7;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createPatientSession(accountId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.patientPortalSession.create({ data: { accountId, tokenHash: hashToken(token), expiresAt } });
  cookies().set(PATIENT_SESSION_COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: expiresAt,
  });
}

export async function getPatientSession() {
  const token = cookies().get(PATIENT_SESSION_COOKIE)?.value;
  if (!token) return null;
  return prisma.patientPortalSession.findFirst({
    where: { tokenHash: hashToken(token), expiresAt: { gt: new Date() } },
    include: { account: { include: { patient: true } } },
  });
}

export async function deletePatientSession() {
  const token = cookies().get(PATIENT_SESSION_COOKIE)?.value;
  if (token) await prisma.patientPortalSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  cookies().set(PATIENT_SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: new Date(0) });
}

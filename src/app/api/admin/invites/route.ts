import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendInviteEmail } from "@/lib/email";
import crypto from "crypto";
import { requirePermission } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requirePermission("user:manage");
  if (access.response) return access.response;

  const invites = await prisma.invite.findMany({
    where: { organizationId: access.user!.organizationId, acceptedAt: null },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(invites);
}

export async function POST(req: NextRequest) {
  const access = await requirePermission("user:manage");
  if (access.response) return access.response;

  const { email, role } = await req.json();
  if (!email || !role) return NextResponse.json({ error: "Email and role are required." }, { status: 400 });
  if (!["RECEPTION", "FRONT_DESK", "DOCTOR", "NURSE", "BILLING", "LAB_RADIOLOGY", "ADMIN", "CLINIC_ADMIN"].includes(role)) return NextResponse.json({ error: "Invalid role." }, { status: 400 });

  const organizationId = access.user!.organizationId;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return NextResponse.json({ error: "This email already has an account." }, { status: 409 });

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invite = await prisma.invite.upsert({
    where: { email_organizationId: { email, organizationId } },
    update: { role, token, expiresAt, acceptedAt: null },
    create: { email, role, token, expiresAt, organizationId },
  });

  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  const acceptUrl = `${process.env.NEXTAUTH_URL}/accept-invite?token=${token}`;

  try {
    await sendInviteEmail(email, org!.name, role, acceptUrl);
  } catch (e) {
    console.error("Failed to send invite email:", e);
    return NextResponse.json({ error: "Invite created but the email failed to send. Check your Resend setup." }, { status: 502 });
  }

  return NextResponse.json(invite, { status: 201 });
}

import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/security";
import { sendPasswordResetEmail } from "@/lib/email";

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function POST(request: NextRequest) {
  const body = await request.json();
  const email = String(body.email || "").trim().toLowerCase();
  // Always return the same response to avoid account enumeration.
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ message: "If an account exists, reset instructions will be sent." });
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, organizationId: true } });
  if (!user) return NextResponse.json({ message: "If an account exists, reset instructions will be sent." });
  const recent = await prisma.passwordResetToken.count({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } } });
  if (recent >= 3) return NextResponse.json({ message: "If an account exists, reset instructions will be sent." });
  const token = randomBytes(32).toString("base64url");
  await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: hash(token), expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
  const appUrl = process.env.NEXTAUTH_URL?.trim() || new URL(request.url).origin;
  const resetUrl = new URL("/reset-password", appUrl);
  resetUrl.searchParams.set("token", token);
  await sendPasswordResetEmail(user.email, resetUrl.toString());
  await audit({ organizationId: user.organizationId, userId: user.id, action: "PASSWORD_RESET_REQUESTED", resourceType: "User", resourceId: user.id, request });
  return NextResponse.json({ message: "If an account exists, reset instructions will be sent." });
}

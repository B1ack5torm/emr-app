import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/security";

export async function POST(request: NextRequest) {
  const { token, password } = await request.json();
  if (typeof token !== "string" || typeof password !== "string" || password.length < 12 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return NextResponse.json({ error: "Use a valid reset token and a password of at least 12 characters containing a letter and number." }, { status: 400 });
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const reset = await prisma.passwordResetToken.findFirst({ where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } } });
  if (!reset) return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { id: reset.userId }, select: { id: true, organizationId: true } });
  if (!user) return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  const changedAt = new Date();
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 12), mustChangePassword: false, passwordChangedAt: changedAt } }),
    prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: changedAt } }),
  ]);
  await audit({ organizationId: user.organizationId, userId: user.id, action: "PASSWORD_RESET_COMPLETED", resourceType: "User", resourceId: user.id, request });
  return NextResponse.json({ message: "Password updated. You can now sign in." });
}

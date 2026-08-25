import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { audit, requireCurrentUser } from "@/lib/security";

export async function POST(req: NextRequest) {
  const access = await requireCurrentUser();
  if (access.response) return access.response;

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Current and new password are required." }, { status: 400 });
  }
  if (newPassword.length < 12 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    return NextResponse.json({ error: "New password must be at least 12 characters and contain a letter and number." }, { status: 400 });
  }

  const userId = access.user!.id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: false, passwordChangedAt: new Date() },
  });
  await audit({ organizationId: user.organizationId, userId, action: "PASSWORD_CHANGED", resourceType: "User", resourceId: userId, request: req });

  return NextResponse.json({ success: true });
}

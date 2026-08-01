import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const invite = await prisma.invite.findUnique({
    where: { token: params.token },
    include: { organization: { select: { name: true } } },
  });

  if (!invite) return NextResponse.json({ error: "Invalid invitation link." }, { status: 404 });
  if (invite.acceptedAt) return NextResponse.json({ error: "This invitation has already been used." }, { status: 410 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: "This invitation has expired." }, { status: 410 });

  return NextResponse.json({
    email: invite.email,
    role: invite.role,
    organizationName: invite.organization.name,
  });
}
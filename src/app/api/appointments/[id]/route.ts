import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["RECEPTION", "ADMIN", "SUPER_ADMIN"].includes((session.user as any).role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const organizationId = (session.user as any).organizationId;
  const appointment = await prisma.appointment.findFirst({ where: { id: params.id, organizationId } });
  if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  const { action } = await req.json();
  if (action === "cancel") {
    if (appointment.status === "CHECKED_IN") return NextResponse.json({ error: "A checked-in appointment cannot be cancelled." }, { status: 409 });
    return NextResponse.json(await prisma.appointment.update({ where: { id: appointment.id }, data: { status: "CANCELLED" } }));
  }
  if (action === "check-in") {
    if (appointment.status !== "SCHEDULED") return NextResponse.json({ error: "Only scheduled appointments can be checked in." }, { status: 409 });
    const result = await prisma.$transaction(async (tx) => {
      const visit = await tx.visit.create({ data: { patientId: appointment.patientId, doctorId: appointment.doctorId, chiefComplaint: appointment.reason, appointmentId: appointment.id } });
      const updated = await tx.appointment.update({ where: { id: appointment.id }, data: { status: "CHECKED_IN" } });
      return { appointment: updated, visit };
    });
    return NextResponse.json(result);
  }
  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}

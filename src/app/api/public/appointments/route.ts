import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const doctors = await prisma.user.findMany({
    where: { role: "DOCTOR", status: "ACTIVE" },
    select: { id: true, name: true, organizationId: true, organization: { select: { name: true } } },
    orderBy: [{ organization: { name: "asc" } }, { name: "asc" }],
  });
  return NextResponse.json(doctors);
}

export async function POST(req: NextRequest) {
  const { doctorId, organizationId, date, time, name, email, phone, reason } = await req.json();
  const patientName = String(name || "").trim();
  const patientEmail = String(email || "").trim().toLowerCase();
  const patientPhone = String(phone || "").trim();
  const startsAt = new Date(`${date}T${time}:00`);
  const durationMinutes = 30;
  if (!doctorId || !organizationId || !patientName || !patientEmail || !patientPhone || Number.isNaN(startsAt.getTime()) || !/^\d{2}:\d{2}$/.test(String(time))) {
    return NextResponse.json({ error: "Doctor, date, time, name, email, and phone are required." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientEmail)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!/^[+\d][\d\s()-]{7,19}$/.test(patientPhone)) return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const latest = new Date(today); latest.setDate(latest.getDate() + 30); latest.setHours(23, 59, 59, 999);
  if (startsAt.getTime() <= Date.now() || startsAt > latest || startsAt.getDay() === 0 || startsAt.getHours() < 9 || startsAt.getHours() >= 17 || startsAt.getMinutes() % 30 !== 0) {
    return NextResponse.json({ error: "That appointment time is not available." }, { status: 400 });
  }
  const doctor = await prisma.user.findFirst({ where: { id: doctorId, organizationId, role: "DOCTOR", status: "ACTIVE" }, select: { id: true } });
  if (!doctor) return NextResponse.json({ error: "Doctor not found." }, { status: 404 });

  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
  try {
    const request = await prisma.$transaction(async (tx) => {
      const [appointments, requests] = await Promise.all([
        tx.appointment.findMany({ where: { doctorId, status: { not: "CANCELLED" }, scheduledAt: { lt: endsAt } }, select: { scheduledAt: true, durationMinutes: true } }),
        tx.appointmentRequest.findMany({ where: { doctorId, status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] }, requestedAt: { lt: endsAt } }, select: { requestedAt: true, durationMinutes: true } }),
      ]);
      const hasConflict = appointments.some((item) => new Date(item.scheduledAt).getTime() + item.durationMinutes * 60_000 > startsAt.getTime()) || requests.some((item) => new Date(item.requestedAt).getTime() + item.durationMinutes * 60_000 > startsAt.getTime());
      if (hasConflict) throw new Error("SLOT_TAKEN");
      return tx.appointmentRequest.create({ data: { doctorId, organizationId, patientName, patientEmail, patientPhone, reason: String(reason || "").trim().slice(0, 500) || null, requestedAt: startsAt, durationMinutes } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ request }, { status: 201 });
  } catch (error) {
    if ((error instanceof Error && error.message === "SLOT_TAKEN") || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")) return NextResponse.json({ error: "That time was just requested. Please choose another slot." }, { status: 409 });
    throw error;
  }
}

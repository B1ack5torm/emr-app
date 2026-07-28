import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const visit = await prisma.visit.findUnique({
    where: { id: params.id },
    include: {
      patient: { include: { allergies: true } },
      prescriptions: true,
      testsOrdered: true,
      doctor: { select: { name: true } },
    },
  });

  if (!visit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(visit);
}

// PATCH /api/visits/:id
// body: { diagnosis, doctorNotes, prescriptions: [{medicine,dosage,frequency,duration}],
//         testsOrdered: string[], complete: boolean }
// Only a doctor can write clinical notes or sign off a visit.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["DOCTOR", "ADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { diagnosis, doctorNotes, prescriptions, testsOrdered, complete } = body;

  if (complete && !session.user?.name) {
    return NextResponse.json({ error: "Signing doctor could not be identified" }, { status: 400 });
  }

  // Replace prescriptions / tests for this visit with the submitted set
  await prisma.prescription.deleteMany({ where: { visitId: params.id } });
  await prisma.testOrder.deleteMany({ where: { visitId: params.id } });

  const visit = await prisma.visit.update({
    where: { id: params.id },
    data: {
      diagnosis,
      doctorNotes,
      doctorId: (session.user as any).id,
      status: complete ? "COMPLETED" : "WAITING",
      signedAt: complete ? new Date() : null,
      prescriptions: {
        create: (prescriptions || [])
          .filter((p: any) => p.medicine?.trim())
          .map((p: any) => ({
            medicine: p.medicine,
            dosage: p.dosage,
            frequency: p.frequency,
            duration: p.duration,
          })),
      },
      testsOrdered: {
        create: (testsOrdered || []).map((name: string) => ({ name })),
      },
    },
    include: { prescriptions: true, testsOrdered: true, doctor: { select: { name: true } } },
  });

  return NextResponse.json(visit);
}

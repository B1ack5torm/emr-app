import { NextResponse } from "next/server";
import { deletePatientSession } from "@/lib/patient-session";

export async function POST() {
  await deletePatientSession();
  return NextResponse.json({ success: true });
}

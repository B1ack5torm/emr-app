import { Resend } from "resend";

type AppointmentNotification = { patientName: string; patientEmail?: string | null; organizationName: string; doctorName?: string | null; scheduledAt: Date; durationMinutes: number; reason?: string | null };
type Delivery = { email: "sent" | "skipped" | "failed" };

function appointmentDetails(input: AppointmentNotification) {
  const dateTime = new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeStyle: "short", timeZone: process.env.APPOINTMENT_TIME_ZONE || "Asia/Kolkata" }).format(input.scheduledAt);
  return { dateTime, doctor: input.doctorName ? `Dr. ${input.doctorName}` : "the assigned doctor" };
}

async function sendEmail(to: string, input: AppointmentNotification, dateTime: string, doctor: string) {
  const response = await new Resend(process.env.RESEND_API_KEY!).emails.send({
    from: process.env.EMAIL_FROM || "CareChart <onboarding@resend.dev>",
    to,
    subject: `Appointment confirmed — ${input.organizationName}`,
    html: `<p>Hello ${input.patientName},</p><p>Your appointment is confirmed for <strong>${dateTime}</strong> with <strong>${doctor}</strong>.</p><p>${input.reason ? `Reason: ${input.reason}<br/>` : ""}Please arrive 10 minutes early.</p><p>${input.organizationName}</p>`,
  });
  if (response.error) throw new Error(response.error.message);
  return "sent" as const;
}

export async function sendAppointmentNotifications(input: AppointmentNotification): Promise<Delivery> {
  const { dateTime, doctor } = appointmentDetails(input);
  try {
    return { email: input.patientEmail && process.env.RESEND_API_KEY ? await sendEmail(input.patientEmail, input, dateTime, doctor) : "skipped" };
  } catch {
    return { email: "failed" };
  }
}

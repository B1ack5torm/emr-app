import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInviteEmail(to: string, orgName: string, role: string, acceptUrl: string) {
  const roleLabel = role === "DOCTOR" ? "Doctor" : role === "ADMIN" ? "Admin" : "Front Desk";
  await resend.emails.send({
    from: process.env.EMAIL_FROM || "CareChart <onboarding@resend.dev>",
    to,
    subject: `You've been invited to join ${orgName} on CareChart`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>You're invited to ${orgName}</h2>
        <p>You've been invited to join <strong>${orgName}</strong> on CareChart as a <strong>${roleLabel}</strong>.</p>
        <p><a href="${acceptUrl}" style="display:inline-block;background:#3D6A5C;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;">Accept invitation</a></p>
        <p style="color:#888;font-size:13px;">This invitation expires in 7 days. If you weren't expecting this, you can ignore this email.</p>
      </div>
    `,
  });
}
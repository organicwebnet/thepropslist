import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

// Providers: Brevo (preferred) or MailerSend (fallback)
// Brevo API: https://api.brevo.com/v3/smtp/email
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_FROM_EMAIL = process.env.BREVO_FROM_EMAIL;
const BREVO_FROM_NAME = process.env.BREVO_FROM_NAME || "Props Bible";

// MailerSend HTTP API integration (fallback if Brevo not configured)
const MS_API_KEY = process.env.MAILERSEND_API_KEY;
const MS_FROM_EMAIL = process.env.MAILERSEND_FROM_EMAIL;
const MS_FROM_NAME = process.env.MAILERSEND_FROM_NAME || "Props Bible";

if (!BREVO_API_KEY || !BREVO_FROM_EMAIL) {
  logger.warn(
    "Brevo secrets not set (BREVO_API_KEY, BREVO_FROM_EMAIL). Will fallback to MailerSend if configured."
  );
}

export const sendInviteEmail = onCall(async (req) => {
  const { to, role, showName, inviteUrl, fromName } = (req.data || {}) as {
    to?: string;
    role?: string;
    showName?: string;
    inviteUrl?: string;
    fromName?: string;
  };

  if (!to) throw new Error("Missing 'to' recipient email");

  const subject = `You're invited to join ${showName || "a show"} on Props Bible`;
  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #111;">
      <p>Hello,</p>
      <p>You’ve been invited as <b>${role || "team member"}</b> on <b>${showName || "this show"}</b>.</p>
      ${inviteUrl ? `<p><a href="${inviteUrl}">Accept your invite</a></p>` : ""}
      ${inviteUrl ? `<p style=\"color:#555\">If the link doesn’t work, copy and paste it: ${inviteUrl}</p>` : ""}
      <p>Thanks,<br/>Props Bible</p>
    </div>
  `;

  // Prefer Brevo if configured
  if (BREVO_API_KEY && BREVO_FROM_EMAIL) {
    const body = {
      sender: { email: BREVO_FROM_EMAIL, name: fromName || BREVO_FROM_NAME },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    } as any;

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(body),
    } as any);

    if (!(res as any).ok) {
      const text = await (res as any).text().catch(() => "");
      logger.error("Brevo send failed", { status: (res as any).status, text });
      throw new Error(`Brevo error: ${(res as any).status}`);
    }
    logger.info("Invite email sent via Brevo", { to, role, showName });
    return { ok: true, provider: "brevo" } as any;
  }

  // Fallback to MailerSend
  if (MS_API_KEY && MS_FROM_EMAIL) {
    const body = {
      from: {
        email: MS_FROM_EMAIL,
        name: fromName || MS_FROM_NAME,
      },
      to: [{ email: to }],
      subject,
      html,
    } as any;

    const res = await fetch("https://api.mailersend.com/v1/email", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    } as any);

    if (!(res as any).ok) {
      const text = await (res as any).text().catch(() => "");
      logger.error("MailerSend send failed", { status: (res as any).status, text });
      throw new Error(`MailerSend error: ${(res as any).status}`);
    }
    logger.info("Invite email sent via MailerSend", { to, role, showName });
    return { ok: true, provider: "mailersend" } as any;
  }

  logger.error("No email provider configured (Brevo or MailerSend)", { to, role, showName });
  return { ok: false, skipped: true } as any;
});



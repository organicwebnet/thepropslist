import { onCall } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import fetch from "cross-fetch";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
// Initialize Admin SDK once
try {
    admin.initializeApp();
}
catch (e) {
    // no-op if already initialized
}
// Providers: Brevo (preferred) or MailerSend (fallback)
// Brevo API: https://api.brevo.com/v3/smtp/email
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_FROM_EMAIL = process.env.BREVO_FROM_EMAIL;
const BREVO_FROM_NAME = process.env.BREVO_FROM_NAME || "The Props List";
// MailerSend HTTP API integration (fallback if Brevo not configured)
const MS_API_KEY = process.env.MAILERSEND_API_KEY;
const MS_FROM_EMAIL = process.env.MAILERSEND_FROM_EMAIL;
const MS_FROM_NAME = process.env.MAILERSEND_FROM_NAME || "The Props List";
if (!BREVO_API_KEY || !BREVO_FROM_EMAIL) {
    logger.warn("Brevo secrets not set (BREVO_API_KEY, BREVO_FROM_EMAIL). Will fallback to MailerSend if configured.");
}
export const sendInviteEmail = onCall(async (req) => {
    const { to, role, showName, inviteUrl, fromName } = (req.data || {});
    if (!to)
        throw new Error("Missing 'to' recipient email");
    const subject = `You're invited to join ${showName || "a show"} on The Props List`;
    const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #111;">
      <p>Hello,</p>
      <p>You’ve been invited as <b>${role || "team member"}</b> on <b>${showName || "this show"}</b>.</p>
      ${inviteUrl ? `<p><a href="${inviteUrl}">Accept your invite</a></p>` : ""}
      ${inviteUrl ? `<p style=\"color:#555\">If the link doesn’t work, copy and paste it: ${inviteUrl}</p>` : ""}
      <p>Thanks,<br/>The Props List</p>
    </div>
  `;
    // Prefer Brevo if configured
    if (BREVO_API_KEY && BREVO_FROM_EMAIL) {
        const body = {
            sender: { email: BREVO_FROM_EMAIL, name: fromName || BREVO_FROM_NAME },
            to: [{ email: to }],
            subject,
            htmlContent: html,
        };
        const res = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                "api-key": BREVO_API_KEY,
                "Content-Type": "application/json",
                accept: "application/json",
            },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            logger.error("Brevo send failed", { status: res.status, text });
            throw new Error(`Brevo error: ${res.status}`);
        }
        logger.info("Invite email sent via Brevo", { to, role, showName });
        return { ok: true, provider: "brevo" };
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
        };
        const res = await fetch("https://api.mailersend.com/v1/email", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${MS_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            logger.error("MailerSend send failed", { status: res.status, text });
            throw new Error(`MailerSend error: ${res.status}`);
        }
        logger.info("Invite email sent via MailerSend", { to, role, showName });
        return { ok: true, provider: "mailersend" };
    }
    logger.error("No email provider configured (Brevo or MailerSend)", { to, role, showName });
    return { ok: false, skipped: true };
});
// --- Feedback → GitHub Issues bridge ---
// Required environment variables:
//   GITHUB_TOKEN: a repo-scoped PAT with issues:write
//   GITHUB_REPO:  "owner/repo" (e.g., organicwebnet/the_props_bible)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || "";
export const onFeedbackCreated = onDocumentCreated("feedback/{id}", async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const id = event.params?.id;
    const data = snap.data();
    if (!GITHUB_TOKEN || !GITHUB_REPO) {
        logger.warn("GitHub integration not configured; skipping issue creation", { id });
        return;
    }
    // Avoid duplicates: if already has issueNumber, skip
    if (data?.githubIssueNumber) {
        return;
    }
    const [owner, repo] = GITHUB_REPO.split("/");
    const titlePrefix = data?.type ? `[${String(data.type).toUpperCase()}] ` : "";
    const sev = data?.severity ? `Severity: ${data.severity}` : "";
    const page = data?.page ? `Page: ${data.page}` : "";
    const env = `App: ${data?.appVersion || "n/a"} | User: ${data?.userId || "anon"} | ${data?.email || "no-email"}`;
    const body = [
        data?.message || "",
        "",
        `Title: ${data?.title || "(no title)"}`,
        [sev, page].filter(Boolean).join(" | "),
        env,
    ].join("\n");
    const labels = [];
    if (data?.type)
        labels.push(String(data.type));
    if (data?.severity)
        labels.push(`sev:${data.severity}`);
    labels.push("from-app");
    try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                "Content-Type": "application/json",
                Accept: "application/vnd.github+json",
            },
            body: JSON.stringify({
                title: `${titlePrefix}${data?.title || "Feedback"}`.slice(0, 120),
                body,
                labels,
            }),
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            logger.error("GitHub issue creation failed", { status: res.status, text });
            return;
        }
        const json = await res.json();
        const issueNumber = json?.number;
        const issueUrl = json?.html_url;
        await admin.firestore().doc(`feedback/${id}`).set({ githubIssueNumber: issueNumber, githubIssueUrl: issueUrl, status: "open" }, { merge: true });
        logger.info("Created GitHub issue from feedback", { id, issueNumber });
    }
    catch (err) {
        logger.error("GitHub integration error", { err });
    }
});

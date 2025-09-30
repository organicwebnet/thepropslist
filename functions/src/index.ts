import { onCall, onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import fetch from "cross-fetch";
import * as logger from "firebase-functions/logger";
import * as functions from "firebase-functions";
// Force Gen1 for specific endpoints
import * as functionsV1 from "firebase-functions/v1";
import * as admin from "firebase-admin";
import type Stripe from "stripe";
import * as nodemailer from "nodemailer";
import { DEFAULT_PRICING_CONFIG, getDefaultFeaturesForPlan } from "./pricing";

// Error reporting service
const reportError = (error: any, context: string, userId?: string) => {
  const errorInfo = {
    message: error.message || 'Unknown error',
    stack: error.stack,
    context,
    userId,
    timestamp: new Date().toISOString(),
    functionName: process.env.FUNCTION_NAME || 'unknown',
  };
  
  logger.error('Error occurred', errorInfo);
  
  // TODO: Integrate with external error reporting service (e.g., Sentry)
  // Example:
  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(error, {
  //     tags: { context, userId },
  //     extra: errorInfo
  //   });
  // }
};

// Initialize Admin SDK once
try {
  admin.initializeApp();
} catch (e) {
  // no-op if already initialized
}

// Providers: Gmail SMTP (preferred), Brevo, or MailerSend (fallback)
// Gmail SMTP configuration - will be set via secrets
let GMAIL_USER: string | undefined;
let GMAIL_PASS: string | undefined;

// Initialize secrets
const initializeSecrets = async () => {
  try {
    const { defineSecret } = await import("firebase-functions/params");
    const gmailUserSecret = defineSecret("GMAIL_USER");
    const gmailPassSecret = defineSecret("GMAIL_PASS");
    
    GMAIL_USER = gmailUserSecret.value();
    GMAIL_PASS = gmailPassSecret.value();
  } catch (error) {
    logger.warn("Failed to initialize secrets, using environment variables", { error });
    GMAIL_USER = process.env.GMAIL_USER;
    GMAIL_PASS = process.env.GMAIL_PASS;
  }
};

// Brevo API: https://api.brevo.com/v3/smtp/email
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_FROM_EMAIL = process.env.BREVO_FROM_EMAIL;
const BREVO_FROM_NAME = process.env.BREVO_FROM_NAME || "The Props List";

// MailerSend HTTP API integration (fallback if others not configured)
const MS_API_KEY = process.env.MAILERSEND_API_KEY;
const MS_FROM_EMAIL = process.env.MAILERSEND_FROM_EMAIL;
const MS_FROM_NAME = process.env.MAILERSEND_FROM_NAME || "The Props List";

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

// --- Feedback → GitHub Issues bridge ---
// Required environment variables:
//   GITHUB_TOKEN: a repo-scoped PAT with issues:write
//   GITHUB_REPO:  "owner/repo" (e.g., organicwebnet/the_props_bible)
// Read from environment variables
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.FEEDBACK_GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || process.env.FEEDBACK_GITHUB_REPO || "";

// NOTE: use a unique name to avoid collisions with existing HTTP functions
// Email processing function for verification codes and invites
export const processEmail = onDocumentCreated({
  document: "emails/{id}",
  region: "us-central1",
  timeoutSeconds: 60,
  memory: "256MiB",
  secrets: ["GMAIL_USER", "GMAIL_PASS"]
}, async (event) => {
  // Initialize secrets first
  await initializeSecrets();
  
  const snap = event.data;
  if (!snap) return;
  const id = event.params?.id as string;
  const data = snap.data() as any;

  // Skip if already processed
  if (data?.processed || data?.delivery?.state) {
    return;
  }

  const { from, to, subject, html, text } = data;
  
  if (!from?.email || !to?.[0]?.email || !subject) {
    logger.warn("Invalid email document", { id, from: from?.email, to: to?.[0]?.email, subject });
    return;
  }

  const toEmail = to[0].email;
  const fromEmail = from.email;
  const fromName = from.name || "The Props List";

  try {
    // Mark as processing
    await snap.ref.set({ 
      processed: true, 
      processingAt: admin.firestore.FieldValue.serverTimestamp(),
      delivery: { state: "processing" }
    }, { merge: true });

    // Prefer Gmail SMTP if configured (fastest delivery)
    if (GMAIL_USER && GMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: GMAIL_USER,
          pass: GMAIL_PASS
        }
      });

      const mailOptions = {
        from: `"${fromName}" <${GMAIL_USER}>`,
        to: toEmail,
        subject: subject,
        html: html,
        text: text
      };

      const result = await transporter.sendMail(mailOptions);
      logger.info("Email sent via Gmail SMTP", { id, toEmail, messageId: result.messageId });
      await snap.ref.set({ 
        delivery: { 
          state: "sent", 
          provider: "gmail-smtp",
          messageId: result.messageId,
          sentAt: admin.firestore.FieldValue.serverTimestamp()
        }
      }, { merge: true });
      return;
    }

    // Fallback to Brevo if configured
    if (BREVO_API_KEY && BREVO_FROM_EMAIL) {
      const body = {
        sender: { email: BREVO_FROM_EMAIL, name: fromName },
        to: [{ email: toEmail }],
        subject,
        htmlContent: html,
        textContent: text,
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
        logger.error("Brevo send failed", { status: (res as any).status, text, id });
        await snap.ref.set({ 
          delivery: { 
            state: "failed", 
            error: `Brevo error: ${(res as any).status}`,
            failedAt: admin.firestore.FieldValue.serverTimestamp()
          }
        }, { merge: true });
        return;
      }
      
      const result = await (res as any).json();
      logger.info("Email sent via Brevo", { id, toEmail, messageId: result?.messageId });
      await snap.ref.set({ 
        delivery: { 
          state: "sent", 
          provider: "brevo",
          messageId: result?.messageId,
          sentAt: admin.firestore.FieldValue.serverTimestamp()
        }
      }, { merge: true });
      return;
    }

    // Fallback to MailerSend
    if (MS_API_KEY && MS_FROM_EMAIL) {
      const body = {
        from: {
          email: MS_FROM_EMAIL,
          name: fromName,
        },
        to: [{ email: toEmail }],
        subject,
        html,
        text,
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
        logger.error("MailerSend send failed", { status: (res as any).status, text, id });
        await snap.ref.set({ 
          delivery: { 
            state: "failed", 
            error: `MailerSend error: ${(res as any).status}`,
            failedAt: admin.firestore.FieldValue.serverTimestamp()
          }
        }, { merge: true });
        return;
      }
      
      const result = await (res as any).json();
      logger.info("Email sent via MailerSend", { id, toEmail, messageId: result?.message_id });
      await snap.ref.set({ 
        delivery: { 
          state: "sent", 
          provider: "mailersend",
          messageId: result?.message_id,
          sentAt: admin.firestore.FieldValue.serverTimestamp()
        }
      }, { merge: true });
      return;
    }

    // No email provider configured
    logger.error("No email provider configured (Brevo or MailerSend)", { id, toEmail });
    await snap.ref.set({ 
      delivery: { 
        state: "failed", 
        error: "No email provider configured",
        failedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    }, { merge: true });

  } catch (err) {
    logger.error("Email processing error", { err, id, toEmail });
    await snap.ref.set({ 
      delivery: { 
        state: "failed", 
        error: err instanceof Error ? err.message : "Unknown error",
        failedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    }, { merge: true });
  }
});

// Direct email sending endpoint to avoid cold start delays
export const sendEmailDirect = onRequest({
  region: "us-central1",
  timeoutSeconds: 30,
  memory: "256MiB",
  secrets: ["GMAIL_USER", "GMAIL_PASS"]
}, async (req, res) => {
  // Initialize secrets first
  await initializeSecrets();
  
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { from, to, subject, html, text } = req.body;
    
    if (!from?.email || !to?.[0]?.email || !subject) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const toEmail = to[0].email;
    const fromEmail = from.email;
    const fromName = from.name || "The Props List";

    // Prefer Gmail SMTP if configured (fastest delivery)
    if (GMAIL_USER && GMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: GMAIL_USER,
          pass: GMAIL_PASS
        }
      });

      const mailOptions = {
        from: `"${fromName}" <${GMAIL_USER}>`,
        to: toEmail,
        subject: subject,
        html: html,
        text: text
      };

      const result = await transporter.sendMail(mailOptions);
      logger.info("Email sent via Gmail SMTP", { toEmail, messageId: result.messageId });
      res.json({ success: true, provider: "gmail-smtp", messageId: result.messageId });
      return;
    }

    // Fallback to Brevo if configured
    if (BREVO_API_KEY && BREVO_FROM_EMAIL) {
      const body = {
        sender: { email: BREVO_FROM_EMAIL, name: fromName },
        to: [{ email: toEmail }],
        subject,
        htmlContent: html,
        textContent: text,
      } as any;

      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": BREVO_API_KEY,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify(body),
      } as any);

      if (!(response as any).ok) {
        const errorText = await (response as any).text().catch(() => "");
        logger.error("Brevo send failed", { status: (response as any).status, errorText });
        res.status(500).json({ error: "Email sending failed" });
        return;
      }
      
      const result = await (response as any).json();
      logger.info("Email sent via Brevo", { toEmail, messageId: result?.messageId });
      res.json({ success: true, provider: "brevo", messageId: result?.messageId });
      return;
    }

    // Fallback to MailerSend
    if (MS_API_KEY && MS_FROM_EMAIL) {
      const body = {
        from: {
          email: MS_FROM_EMAIL,
          name: fromName,
        },
        to: [{ email: toEmail }],
        subject,
        html,
        text,
      } as any;

      const response = await fetch("https://api.mailersend.com/v1/email", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MS_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      } as any);

      if (!(response as any).ok) {
        const errorText = await (response as any).text().catch(() => "");
        logger.error("MailerSend send failed", { status: (response as any).status, errorText });
        res.status(500).json({ error: "Email sending failed" });
        return;
      }
      
      const result = await (response as any).json();
      logger.info("Email sent via MailerSend", { toEmail, messageId: result?.message_id });
      res.json({ success: true, provider: "mailersend", messageId: result?.message_id });
      return;
    }

    // No email provider configured
    logger.error("No email provider configured (Brevo or MailerSend)", { toEmail });
    res.status(500).json({ error: "No email provider configured" });

  } catch (err) {
    logger.error("Direct email sending error", { err });
    res.status(500).json({ error: "Internal server error" });
  }
});

export const feedbackIssueBridge = onDocumentCreated("feedback/{id}", async (event) => {
  const snap = event.data;
  if (!snap) return;
  const id = event.params?.id as string;
  const data = snap.data() as any;

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

  const labels: string[] = [];
  if (data?.type) labels.push(String(data.type));
  if (data?.severity) labels.push(`sev:${data.severity}`);
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
    } as any);

    if (!(res as any).ok) {
      const text = await (res as any).text().catch(() => "");
      logger.error("GitHub issue creation failed", { status: (res as any).status, text });
      return;
    }
    const json = await (res as any).json();
    const issueNumber = json?.number;
    const issueUrl = json?.html_url;
    await admin.firestore().doc(`feedback/${id}`).set({ githubIssueNumber: issueNumber, githubIssueUrl: issueUrl, status: "open" }, { merge: true });
    logger.info("Created GitHub issue from feedback", { id, issueNumber });
  } catch (err) {
    logger.error("GitHub integration error", { err });
  }
});

// EU-region Firestore trigger to match Firestore (eur3) and avoid Eventarc/Run region mismatch
// NOTE: renamed (EU) to avoid function type-change collisions
export const feedbackToGithubEU = (functionsV1 as any)
  .region('europe-west1')
  .firestore.document('feedback/{id}')
  .onCreate(async (snap: any, context: any) => {
    try {
      const id = context?.params?.id as string;
      const data = snap.data() as any;

      const runtimeConfig = (functions as any)?.config ? (functions as any).config() : {};
      const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.FEEDBACK_GITHUB_TOKEN || runtimeConfig?.feedback?.github_token;
      const GITHUB_REPO = process.env.GITHUB_REPO || process.env.FEEDBACK_GITHUB_REPO || runtimeConfig?.feedback?.github_repo || "";
      if (!GITHUB_TOKEN || !GITHUB_REPO) {
        logger.warn("GitHub integration not configured; skipping issue creation", { id });
        return;
      }
      if (data?.githubIssueNumber) return; // already processed

      const [owner, repo] = String(GITHUB_REPO).split("/");
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
        data?.screenshotUrl ? `Screenshot: ${data.screenshotUrl}` : ''
      ].filter(Boolean).join("\n");

      const labels: string[] = [];
      if (data?.type) labels.push(String(data.type));
      if (data?.severity) labels.push(`sev:${data.severity}`);
      labels.push("from-app");

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
      } as any);

      if (!(res as any).ok) {
        const text = await (res as any).text().catch(() => "");
        logger.error("GitHub issue creation failed (EU)", { status: (res as any).status, text });
        return;
      }
      const json = await (res as any).json();
      const issueNumber = json?.number;
      const issueUrl = json?.html_url;
      await admin.firestore().doc(`feedback/${id}`).set({ githubIssueNumber: issueNumber, githubIssueUrl: issueUrl, status: "open" }, { merge: true });
      logger.info("Created GitHub issue from feedback (EU)", { id, issueNumber });
    } catch (err) {
      logger.error("onFeedbackCreatedEU error", { err });
    }
  });

// --- Stripe Billing (Webhook + Customer Portal) ---
const cfg = (functions as any)?.config ? (functions as any).config() : {};
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || cfg?.stripe?.secret;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || cfg?.stripe?.webhook_secret;
// Optional price ids if you want to map to friendly plan names
const PRICE_STARTER = process.env.PRICE_STARTER || cfg?.stripe?.plan_starter_price;
const PRICE_STANDARD = process.env.PRICE_STANDARD || cfg?.stripe?.plan_standard_price;
const PRICE_PRO = process.env.PRICE_PRO || cfg?.stripe?.plan_pro_price;

let stripe: Stripe | null = null;
async function ensureStripe(): Promise<Stripe | null> {
  if (stripe) return stripe;
  if (!STRIPE_SECRET_KEY) {
    logger.warn("Stripe secret key not configured; billing endpoints will be inert.");
    return null;
  }
  const mod = await import("stripe");
  const StripeCtor = (mod as any).default as typeof Stripe;
  stripe = new StripeCtor(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" as any });
  return stripe;
}

function mapPlan(priceId?: string | null): string | undefined {
  if (!priceId) return undefined;
  if (PRICE_STARTER && priceId === PRICE_STARTER) return "starter";
  if (PRICE_STANDARD && priceId === PRICE_STANDARD) return "standard";
  if (PRICE_PRO && priceId === PRICE_PRO) return "pro";
  return undefined;
}

export const stripeWebhook = onRequest({ region: "us-central1" }, async (req, res) => {
  try {
    const s = await ensureStripe();
    if (!s || !STRIPE_WEBHOOK_SECRET) {
      res.status(200).send("stripe not configured");
      return;
    }
    const sig = req.headers["stripe-signature"] as string;
    const event = s.webhooks.constructEvent(req.rawBody, sig, STRIPE_WEBHOOK_SECRET);

    // Helper to upsert profile by email
    const upsertByEmail = async (email: string, data: any) => {
      const snap = await admin.firestore().collection("userProfiles").where("email", "==", email).limit(1).get();
      if (snap.empty) return;
      const doc = snap.docs[0];
      await doc.ref.set(data, { merge: true });
    };

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = (session.customer as string) || "";
        const subscriptionId = (session.subscription as string) || "";
        const email = session.customer_details?.email || session.client_reference_id || "";
        let planPriceId: string | undefined;
        try {
          if (subscriptionId && s) {
            const sub = await s.subscriptions.retrieve(subscriptionId);
            planPriceId = sub.items.data[0]?.price?.id;
          }
        } catch {}
        const plan = mapPlan(planPriceId);
        const update = {
          stripeCustomerId: customerId || undefined,
          subscriptionId: subscriptionId || undefined,
          planPriceId: planPriceId || undefined,
          plan: plan || undefined,
          subscriptionStatus: session.status || "active",
          currentPeriodEnd: session.expires_at || undefined,
          lastStripeEventTs: Date.now(),
        } as any;
        if (email) await upsertByEmail(email, update);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = (sub.customer as string) || "";
        const status = sub.status;
        const planPriceId = sub.items.data[0]?.price?.id;
        const plan = mapPlan(planPriceId);
        const currentPeriodEnd = typeof sub.current_period_end === "number" ? sub.current_period_end : undefined;
        // Lookup customer email to find profile
        let email = "";
        try {
          if (s && customerId) {
            const cust = await s.customers.retrieve(customerId);
            email = (cust as any)?.email || "";
          }
        } catch {}
        const update = {
          stripeCustomerId: customerId || undefined,
          subscriptionId: sub.id,
          subscriptionStatus: status,
          planPriceId: planPriceId || undefined,
          plan: plan || undefined,
          currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancel_at_period_end || false,
          lastStripeEventTs: Date.now(),
        } as any;
        if (email) {
          const snap = await admin.firestore().collection("userProfiles").where("email", "==", email).limit(1).get();
          if (!snap.empty) await snap.docs[0].ref.set(update, { merge: true });
        }
        break;
      }
      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = (invoice.customer as string) || "";
        let email = "";
        try {
          if (s && customerId) {
            const cust = await s.customers.retrieve(customerId);
            email = (cust as any)?.email || "";
          }
        } catch {}
        if (email) {
          await upsertByEmail(email, { lastStripeEventTs: Date.now() });
        }
        break;
      }
      default:
        break;
    }
    res.status(200).send("ok");
  } catch (err) {
    logger.error("stripe webhook error", { err });
    res.status(400).send(`webhook error`);
  }
});

export const createBillingPortalSession = onCall({ region: "us-central1" }, async (req) => {
  if (!req.auth) throw new Error("unauthenticated");
  const s = await ensureStripe();
  if (!s) throw new Error("Stripe not configured");
  const uid = req.auth.uid;
  const db = admin.firestore();
  const profileRef = db.doc(`userProfiles/${uid}`);
  const profileSnap = await profileRef.get();
  const profile = profileSnap.exists ? (profileSnap.data() as any) : {};
  let customerId: string | undefined = profile?.stripeCustomerId;

  if (!customerId) {
    // Try to find by email
    const user = await admin.auth().getUser(uid).catch(() => undefined);
    const email = (profile?.email || user?.email) as string | undefined;
    if (email && s) {
      const list = await s.customers.list({ email, limit: 1 });
      if (list.data.length > 0) customerId = list.data[0].id;
    }
    if (customerId) await profileRef.set({ stripeCustomerId: customerId }, { merge: true });
  }
  if (!customerId) throw new Error("No Stripe customer");

  const returnUrl = process.env.BILLING_RETURN_URL || cfg?.app?.billing_return_url || "https://app.thepropslist.uk/profile";
  const session = await s.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return { url: session.url } as any;
});

// --- Create Stripe Checkout session for new/upgrades ---
export const createCheckoutSession = onCall({ region: "us-central1" }, async (req) => {
  if (!req.auth) throw new Error("unauthenticated");
  const s = await ensureStripe();
  if (!s) throw new Error("Stripe not configured");
  const uid = req.auth.uid;
  const priceId = String(req.data?.priceId || "").trim();
  if (!priceId) throw new Error("priceId required");

  const db = admin.firestore();
  const profileRef = db.doc(`userProfiles/${uid}`);
  const snap = await profileRef.get();
  const profile = snap.exists ? (snap.data() as any) : {};

  // Ensure customer by email
  const user = await admin.auth().getUser(uid).catch(() => undefined);
  const email = (profile?.email || user?.email) as string | undefined;
  let customerId: string | undefined = profile?.stripeCustomerId;
  if (!customerId && email) {
    const list = await s.customers.list({ email, limit: 1 });
    customerId = list.data[0]?.id;
  }
  if (!customerId && email) {
    const cust = await s.customers.create({ email });
    customerId = cust.id;
  }
  if (customerId) await profileRef.set({ stripeCustomerId: customerId }, { merge: true });

  const successUrl = process.env.CHECKOUT_SUCCESS_URL || cfg?.app?.checkout_success_url || "https://app.thepropslist.uk/profile";
  const cancelUrl = process.env.CHECKOUT_CANCEL_URL || cfg?.app?.checkout_cancel_url || "https://app.thepropslist.uk/profile";

  const session = await s.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
  });
  return { url: session.url } as any;
});

// --- Create Stripe Coupon ---
export const createStripeCoupon = onCall({ region: "us-central1" }, async (req) => {
  const s = await ensureStripe();
  if (!s) {
    throw new Error("Stripe not configured");
  }

  const { id, name, percent_off, amount_off, currency, max_redemptions, redeem_by } = req.data;

  try {
    const coupon = await s.coupons.create({
      id,
      name,
      percent_off,
      amount_off,
      currency,
      max_redemptions,
      redeem_by
    });

    return { couponId: coupon.id } as any;
  } catch (error) {
    logger.error('Error creating Stripe coupon:', error);
    throw new Error('Failed to create Stripe coupon');
  }
});

// --- Create Stripe Promotion Code ---
export const createStripePromotionCode = onCall({ region: "us-central1" }, async (req) => {
  const s = await ensureStripe();
  if (!s) {
    throw new Error("Stripe not configured");
  }

  const { coupon, code, active } = req.data;

  try {
    const promotionCode = await s.promotionCodes.create({
      coupon,
      code,
      active
    });

    return { promotionCodeId: promotionCode.id } as any;
  } catch (error) {
    logger.error('Error creating Stripe promotion code:', error);
    throw new Error('Failed to create Stripe promotion code');
  }
});

// --- Get Stripe Coupons ---
export const getStripeCoupons = onCall({ region: "us-central1" }, async (req) => {
  const s = await ensureStripe();
  if (!s) {
    throw new Error("Stripe not configured");
  }

  try {
    const coupons = await s.coupons.list({ limit: 100 });
    return { coupons: coupons.data } as any;
  } catch (error) {
    logger.error('Error fetching Stripe coupons:', error);
    throw new Error('Failed to fetch Stripe coupons');
  }
});

// --- Get Stripe Promotion Codes ---
export const getStripePromotionCodes = onCall({ region: "us-central1" }, async (req) => {
  const s = await ensureStripe();
  if (!s) {
    throw new Error("Stripe not configured");
  }

  try {
    const promotionCodes = await s.promotionCodes.list({ limit: 100 });
    return { promotionCodes: promotionCodes.data } as any;
  } catch (error) {
    logger.error('Error fetching Stripe promotion codes:', error);
    throw new Error('Failed to fetch Stripe promotion codes');
  }
});

// Import shared pricing configuration
const DEFAULT_PLAN_FEATURES: Record<string, string[]> = {
  'free': [
    '1 Show', '2 Task Boards', '20 Packing Boxes',
    '3 Collaborators per Show', '10 Props', 'Basic Support'
  ],
  'starter': [
    '3 Shows', '5 Task Boards', '200 Packing Boxes',
    '5 Collaborators per Show', '50 Props', 'Email Support'
  ],
  'standard': [
    '10 Shows', '20 Task Boards', '1000 Packing Boxes',
    '15 Collaborators per Show', '100 Props', 'Priority Support',
    'Custom Branding'
  ],
  'pro': [
    '100 Shows', '200 Task Boards', '10000 Packing Boxes',
    '100 Collaborators per Show', '1000 Props', '24/7 Support',
    'Custom Branding'
  ]
};

// Helper function to get default features for a plan
function getDefaultFeaturesForPlan(planId: string): string[] {
  return DEFAULT_PLAN_FEATURES[planId] || [];
}

// --- Get pricing configuration from Stripe ---
export const getPricingConfig = onCall({ region: "us-central1" }, async (req) => {
  const s = await ensureStripe();
  if (!s) {
    // Return shared default configuration as fallback if Stripe is not configured
    return DEFAULT_PRICING_CONFIG as any;
  }

  try {
    // Fetch products and prices from Stripe
    const products = await s.products.list({ active: true, type: 'service' });
    const prices = await s.prices.list({ active: true });
    
    // Map Stripe data to our pricing structure
    const plans = products.data.map(product => {
      const productPrices = prices.data.filter(price => price.product === product.id);
      const monthlyPrice = productPrices.find(p => p.recurring?.interval === 'month');
      const yearlyPrice = productPrices.find(p => p.recurring?.interval === 'year');
      
      // Extract plan ID from product metadata or name
      const planId = product.metadata?.plan_id || product.name.toLowerCase().replace(/\s+/g, '-');
      
      return {
        id: planId,
        name: product.name,
        description: product.description || '',
        price: {
          monthly: monthlyPrice ? (monthlyPrice.unit_amount || 0) / 100 : 0,
          yearly: yearlyPrice ? (yearlyPrice.unit_amount || 0) / 100 : 0,
          currency: monthlyPrice?.currency || 'usd'
        },
        features: product.metadata?.features 
          ? product.metadata.features.split(',').map(f => f.trim()).filter(f => f.length > 0)
          : getDefaultFeaturesForPlan(planId),
        limits: {
          // Per-plan limits (total across all shows)
          shows: parseInt(product.metadata?.shows || '0'),
          boards: parseInt(product.metadata?.boards || '0'),
          packingBoxes: parseInt(product.metadata?.packing_boxes || '0'),
          collaboratorsPerShow: parseInt(product.metadata?.collaborators || '0'),
          props: parseInt(product.metadata?.props || '0'),
          archivedShows: parseInt(product.metadata?.archived_shows || '0'),
          // Per-show limits (per individual show)
          boardsPerShow: product.metadata?.boards_per_show || '0',
          packingBoxesPerShow: product.metadata?.packing_boxes_per_show || '0',
          collaboratorsPerShowLimit: product.metadata?.collaborators_per_show || '0',
          propsPerShow: product.metadata?.props_per_show || '0',
        },
        priceId: {
          monthly: monthlyPrice?.id || '',
          yearly: yearlyPrice?.id || ''
        },
        popular: product.metadata?.popular === 'true',
        color: product.metadata?.color || 'bg-gray-500'
      };
    });

    return {
      currency: 'USD',
      billingInterval: 'monthly',
      plans
    } as any;
  } catch (error) {
    logger.error('Error fetching pricing config from Stripe:', error);
    throw new Error('Failed to fetch pricing configuration');
  }
});

// --- Seed test users (god/system-admin only) ---
export const seedTestUsers = onCall({ region: "us-central1" }, async (req) => {
  if (!req.auth) throw new Error("unauthenticated");
  const uid = req.auth.uid;
  const db = admin.firestore();
  // Check role from userProfiles OR fallback to users. Also allow custom claim 'admin'
  const prof = await db.doc(`userProfiles/${uid}`).get();
  let me = prof.exists ? (prof.data() as any) : {};
  if (!me || Object.keys(me).length === 0) {
    const userDoc = await db.doc(`users/${uid}`).get();
    if (userDoc.exists) me = { ...(userDoc.data() as any) };
  }
  const token = (req as any).auth?.token || {};
  const isGod = String(me?.role || '').toLowerCase() === 'god';
  const isSystemAdmin = !!(me?.groups && me.groups['system-admin'] === true) || !!token.admin;
  if (!isGod && !isSystemAdmin) throw new Error("forbidden");

  const base = [
    { email: 'test_free@thepropslist.test', plan: 'free' },
    { email: 'test_starter@thepropslist.test', plan: 'starter' },
    { email: 'test_standard@thepropslist.test', plan: 'standard' },
    { email: 'test_pro@thepropslist.test', plan: 'pro' },
  ];
  const password = String(req.data?.password || 'PropsList-Test1!');

  const out: any[] = [];
  for (const { email, plan } of base) {
    let userRecord: admin.auth.UserRecord | null = null;
    try {
      const existing = await admin.auth().getUserByEmail(email);
      userRecord = existing;
    } catch {
      userRecord = await admin.auth().createUser({ email, password, emailVerified: true, displayName: email.split('@')[0] });
    }
    if (!userRecord) continue;
    const userId = userRecord.uid;
    await db.doc(`users/${userId}`).set({ uid: userId, email, displayName: userRecord.displayName || email.split('@')[0], role: 'user', createdAt: Date.now(), lastLogin: null }, { merge: true });
    await db.doc(`userProfiles/${userId}`).set({ email, role: 'user', groups: {}, plan, subscriptionStatus: 'active', lastStripeEventTs: Date.now() }, { merge: true });
    out.push({ email, password, uid: userId, plan });
  }
  return { ok: true, users: out } as any;
});

// --- Seed role-based test users (god/system-admin only) ---
export const seedRoleBasedTestUsers = onCall({ region: "us-central1" }, async (req) => {
  if (!req.auth) throw new Error("unauthenticated");
  const uid = req.auth.uid;
  const db = admin.firestore();
  
  // Check role from userProfiles OR fallback to users. Also allow custom claim 'admin'
  const prof = await db.doc(`userProfiles/${uid}`).get();
  let me = prof.exists ? (prof.data() as any) : {};
  if (!me || Object.keys(me).length === 0) {
    const userDoc = await db.doc(`users/${uid}`).get();
    if (userDoc.exists) me = { ...(userDoc.data() as any) };
  }
  const token = (req as any).auth?.token || {};
  const isGod = String(me?.role || '').toLowerCase() === 'god';
  const isSystemAdmin = !!(me?.groups && me.groups['system-admin'] === true) || !!token.admin;
  if (!isGod && !isSystemAdmin) throw new Error("forbidden");

  const roleBasedUsers = [
    { 
      email: 'test_god@thepropslist.test', 
      role: 'god', 
      groups: { 'system-admin': true },
      permissions: {
        canEditProps: true,
        canDeleteProps: true,
        canManageUsers: true,
        canEditShows: true,
        canCreateProps: true
      }
    },
    { 
      email: 'test_props_supervisor@thepropslist.test', 
      role: 'props_supervisor',
      groups: {},
      permissions: {
        canEditProps: true,
        canDeleteProps: true,
        canManageUsers: true,
        canEditShows: true,
        canCreateProps: true
      }
    },
    { 
      email: 'test_stage_manager@thepropslist.test', 
      role: 'stage_manager',
      groups: {},
      permissions: {
        canEditProps: true,
        canDeleteProps: false,
        canManageUsers: false,
        canEditShows: false,
        canCreateProps: true
      }
    },
    { 
      email: 'test_prop_maker@thepropslist.test', 
      role: 'prop_maker',
      groups: {},
      permissions: {
        canEditProps: true,
        canDeleteProps: false,
        canManageUsers: false,
        canEditShows: false,
        canCreateProps: true
      }
    },
    { 
      email: 'test_viewer@thepropslist.test', 
      role: 'viewer',
      groups: {},
      permissions: {
        canEditProps: false,
        canDeleteProps: false,
        canManageUsers: false,
        canEditShows: false,
        canCreateProps: false
      }
    }
  ];
  
  const password = String(req.data?.password || 'PropsList-Test1!');
  const out: any[] = [];
  
  for (const userConfig of roleBasedUsers) {
    let userRecord: admin.auth.UserRecord | null = null;
    try {
      const existing = await admin.auth().getUserByEmail(userConfig.email);
      userRecord = existing;
    } catch {
      userRecord = await admin.auth().createUser({ 
        email: userConfig.email, 
        password, 
        emailVerified: true, 
        displayName: userConfig.email.split('@')[0] 
      });
    }
    if (!userRecord) continue;
    
    const userId = userRecord.uid;
    
    // Create user document
    await db.doc(`users/${userId}`).set({ 
      uid: userId, 
      email: userConfig.email, 
      displayName: userRecord.displayName || userConfig.email.split('@')[0], 
      role: userConfig.role, 
      createdAt: Date.now(), 
      lastLogin: null,
      permissions: userConfig.permissions
    }, { merge: true });
    
    // Create user profile document
    await db.doc(`userProfiles/${userId}`).set({ 
      email: userConfig.email, 
      role: userConfig.role, 
      groups: userConfig.groups, 
      plan: 'pro', // Give all role-based test users pro plan for testing
      subscriptionStatus: 'active', 
      lastStripeEventTs: Date.now(),
      permissions: userConfig.permissions
    }, { merge: true });
    
    out.push({ 
      email: userConfig.email, 
      password, 
      uid: userId, 
      role: userConfig.role,
      permissions: userConfig.permissions
    });
  }
  
  return { ok: true, users: out } as any;
});

// --- Admin: Subscription stats (god/system-admin only) ---
export const getSubscriptionStats = onCall({ region: "us-central1" }, async (req) => {
  if (!req.auth) throw new Error("unauthenticated");
  const uid = req.auth.uid;
  const db = admin.firestore();
  const profileSnap = await db.doc(`userProfiles/${uid}`).get();
  const profile = profileSnap.exists ? (profileSnap.data() as any) : {};

  const isGod = profile?.role === "god";
  const isSystemAdmin = !!(profile?.groups && profile.groups["system-admin"] === true);
  if (!isGod && !isSystemAdmin) throw new Error("forbidden");

  const usersSnap = await db.collection("userProfiles").get();
  const byPlan: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let total = 0;
  usersSnap.forEach((doc) => {
    const d = doc.data() as any;
    total += 1;
    const plan = (d.plan || d.subscriptionPlan || "unknown").toString();
    const status = (d.subscriptionStatus || "unknown").toString();
    byPlan[plan] = (byPlan[plan] || 0) + 1;
    byStatus[status] = (byStatus[status] || 0) + 1;
  });

  return { total, byPlan, byStatus } as any;
});

// --- Public container info for marketing site (/c/:id) ---
export const publicContainerInfo = onRequest({ region: "us-central1", timeoutSeconds: 120, memory: "512MiB" as any, minInstances: 1 as any }, async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  const idOrCode = ((req.query.id as string) || (req.query.code as string) || "").trim();
  if (!idOrCode) {
    res.status(400).json({ error: "missing id" });
    return;
  }
  try {
    const db = admin.firestore();
    // First: search within packLists.containers[] (legacy schema)
    const listsSnap = await db.collection("packLists").get();
    let found: any = null;
    listsSnap.forEach((doc) => {
      if (found) return;
      const data = doc.data();
      // Case 1: packList doc with containers array
      const containers = Array.isArray((data as any).containers) ? (data as any).containers : [];
      const match = containers.find((c: any) => c && (c.id === idOrCode || c.code === idOrCode || c.name === idOrCode));
      if (match) { found = match; return; }
      // Case 2: some apps wrote container docs directly into packLists
      if (!found && (data as any).name === idOrCode && Array.isArray((data as any).props)) {
        found = {
          id: (data as any).id || doc.id,
          code: (data as any).code || (data as any).shortCode || undefined,
          name: (data as any).name,
          status: (data as any).status || (data as any).containerStatus,
          props: (data as any).props,
        } as any;
      }
    });

    // Second: search dedicated packingBoxes collection (current schema)
    let boxDoc: FirebaseFirestore.DocumentSnapshot | null = null;
    if (!found) {
      // Try direct doc lookup
      boxDoc = await db.collection("packingBoxes").doc(idOrCode).get();
      if (!boxDoc.exists) {
        // Try common fields
        const tryFields = ["code", "shortCode", "id", "name"];
        for (const field of tryFields) {
          const qs = await db.collection("packingBoxes").where(field, "==", idOrCode).limit(1).get();
          if (!qs.empty) { boxDoc = qs.docs[0]; break; }
        }
      }
      if (boxDoc && boxDoc.exists) {
        const d = boxDoc.data() || {};
        found = {
          id: d.id || boxDoc.id,
          code: (d as any).code || (d as any).shortCode || undefined,
          name: (d as any).name || boxDoc.id,
          status: (d as any).status || (d as any).containerStatus,
          props: Array.isArray((d as any).props) ? (d as any).props : [],
        } as any;
      }
    }

    if (!found) {
      res.status(404).json({ error: "not found" });
      return;
    }

    // Resolve prop names and first images if possible
    let propsOut: any[] = [];
    let publicProps: any[] = [];
    try {
      const propIds: string[] = Array.isArray(found.props) ? found.props.map((p: any) => p?.propId).filter(Boolean) : [];
      if (propIds.length) {
        const chunk = 10;
        const names: Record<string, string> = {};
        const firstImageUrl: Record<string, string> = {};
        for (let i = 0; i < propIds.length; i += chunk) {
          const group = propIds.slice(i, i + chunk);
          const qs = await db.collection("props").where(admin.firestore.FieldPath.documentId(), "in", group).get();
          qs.forEach(d => {
            const data = d.data() as any;
            names[d.id] = data?.name || "";
            try {
              const imgs = Array.isArray(data?.images) ? data.images : [];
              const first = imgs.find((x: any) => x && (x.url || x.downloadURL || x.src));
              firstImageUrl[d.id] = (first?.url || first?.downloadURL || first?.src || "");
            } catch {}
          });
        }
        const limited = (found.props || []).slice(0, 50);
        propsOut = limited.map((p: any) => ({ name: names[p.propId] || p.name || "", quantity: p.quantity || 0 }));
        publicProps = limited.map((p: any) => ({ name: names[p.propId] || p.name || "", quantity: p.quantity || 0, imageUrl: firstImageUrl[p.propId] || "" }));
      }
    } catch {}

    // Load children (nested) if any
    let children: any[] = [];
    try {
      const childQs = await db.collection("packingBoxes").where("parentId", "==", found.id || idOrCode).limit(100).get();
      children = childQs.docs.map(d => {
        const cd = d.data() as any;
        return { id: d.id, code: cd.code || cd.shortCode || null, name: cd.name || d.id };
      });
    } catch {}

    const publicData = {
      id: found.id || idOrCode,
      name: found.name || found.code || "Container",
      status: found.status || "unknown",
      propCount: Array.isArray(found.props) ? found.props.reduce((s: number, p: any) => s + (p.quantity || 0), 0) : 0,
      props: propsOut,
      publicProps,
      children,
    } as any;
    res.json(publicData);
  } catch (err) {
    logger.error("publicContainerInfo error", { err });
    res.status(500).json({ error: "internal" });
  }
});

// Gen1 fallback for public container info to bypass Cloud Run startup issues
// Renamed to avoid version-downgrade conflicts if a V2 function with the same name ever existed
export const publicContainerInfoLegacyV1 = (functionsV1 as any).https.onRequest(async (req: any, res: any) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }

  const idOrCode = ((req.query?.id as string) || (req.query?.code as string) || "").trim();
  if (!idOrCode) { res.status(400).json({ error: "missing id" }); return; }

  try {
    const db = admin.firestore();
    // First: search within packLists.containers[] (legacy schema)
    const listsSnap = await db.collection("packLists").get();
    let found: any = null;
    listsSnap.forEach((doc) => {
      if (found) return;
      const data: any = doc.data();
      const containers = Array.isArray(data?.containers) ? data.containers : [];
      const match = containers.find((c: any) => c && (c.id === idOrCode || c.code === idOrCode || c.name === idOrCode));
      if (match) { found = match; return; }
      if (!found && data?.name === idOrCode && Array.isArray(data?.props)) {
        found = { id: data.id || doc.id, code: data.code || data.shortCode || undefined, name: data.name, status: data.status || data.containerStatus, props: data.props };
      }
    });

    // Second: search dedicated packingBoxes collection (current schema)
    let boxDoc: FirebaseFirestore.DocumentSnapshot | null = null;
    if (!found) {
      boxDoc = await db.collection("packingBoxes").doc(idOrCode).get();
      if (!boxDoc.exists) {
        const tryFields = ["code", "shortCode", "id", "name"];
        for (const field of tryFields) {
          const qs = await db.collection("packingBoxes").where(field, "==", idOrCode).limit(1).get();
          if (!qs.empty) { boxDoc = qs.docs[0]; break; }
        }
      }
      if (boxDoc && boxDoc.exists) {
        const d: any = boxDoc.data() || {};
        found = { id: d.id || boxDoc.id, code: d.code || d.shortCode || undefined, name: d.name || boxDoc.id, status: d.status || d.containerStatus, props: Array.isArray(d.props) ? d.props : [] };
      }
    }

    if (!found) { res.status(404).json({ error: "not found" }); return; }

    // Resolve prop names and first images if possible
    let propsOut: any[] = [];
    let publicProps: any[] = [];
    try {
      const propIds: string[] = Array.isArray(found.props) ? found.props.map((p: any) => p?.propId).filter(Boolean) : [];
      if (propIds.length) {
        const chunk = 10;
        const names: Record<string, string> = {};
        const firstImageUrl: Record<string, string> = {};
        for (let i = 0; i < propIds.length; i += chunk) {
          const group = propIds.slice(i, i + chunk);
          const qs = await db.collection("props").where(admin.firestore.FieldPath.documentId(), "in", group).get();
          qs.forEach(d => {
            const data: any = d.data();
            names[d.id] = data?.name || "";
            try {
              const imgs = Array.isArray(data?.images) ? data.images : [];
              const first = imgs.find((x: any) => x && (x.url || x.downloadURL || x.src));
              firstImageUrl[d.id] = (first?.url || first?.downloadURL || first?.src || "");
            } catch {}
          });
        }
        const limited = (found.props || []).slice(0, 50);
        propsOut = limited.map((p: any) => ({ name: names[p.propId] || p.name || "", quantity: p.quantity || 0 }));
        publicProps = limited.map((p: any) => ({ name: names[p.propId] || p.name || "", quantity: p.quantity || 0, imageUrl: firstImageUrl[p.propId] || "" }));
      }
    } catch {}

    // Load children (nested) if any
    let children: any[] = [];
    try {
      const childQs = await db.collection("packingBoxes").where("parentId", "==", found.id || idOrCode).limit(100).get();
      children = childQs.docs.map(d => { const cd: any = d.data(); return { id: d.id, code: cd.code || cd.shortCode || null, name: cd.name || d.id }; });
    } catch {}

    const publicData = {
      id: found.id || idOrCode,
      name: found.name || found.code || "Container",
      status: found.status || "unknown",
      propCount: Array.isArray(found.props) ? found.props.reduce((s: number, p: any) => s + (p.quantity || 0), 0) : 0,
      props: propsOut,
      publicProps,
      children,
    } as any;

    res.json(publicData);
  } catch (err) {
    logger.error("publicContainerInfoV1 error", { err });
    res.status(500).json({ error: "internal" });
  }
});

// --- Normalization utilities ---
export const normalizeContainers = onCall({ region: "us-central1" }, async (req) => {
  const commit = !!req.data?.commit;
  const dryRun: any[] = [];
  const db = admin.firestore();

  // 1) Migrate inline containers in packLists into packingBoxes
  const lists = await db.collection("packLists").get();
  for (const doc of lists.docs) {
    const data = doc.data() as any;
    // Case: doc looks like a container (has props and name)
    if (Array.isArray(data?.props) && typeof data?.name === "string" && !Array.isArray(data?.containers)) {
      const code = data.name;
      const boxId = data.id || doc.id;
      dryRun.push({ action: "upsertBoxFromInlinePackListDoc", source: doc.id, target: boxId, code });
      if (commit) {
        await db.collection("packingBoxes").doc(boxId).set({
          id: boxId,
          code,
          name: data.name,
          type: data.type || "box",
          status: data.status || "unknown",
          props: Array.isArray(data.props) ? data.props : [],
          labels: Array.isArray(data.labels) ? data.labels : [],
          metadata: { createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() },
        }, { merge: true });
      }
      continue;
    }
    // Case: containers array
    const containers = Array.isArray(data?.containers) ? data.containers : [];
    for (const c of containers) {
      if (!c || typeof c !== "object") continue;
      const boxId = c.id || c.code || c.name || undefined;
      if (!boxId) continue;
      dryRun.push({ action: "upsertBoxFromContainersArray", source: doc.id, target: boxId });
      if (commit) {
        await db.collection("packingBoxes").doc(String(boxId)).set({
          id: String(boxId),
          code: c.code || undefined,
          name: c.name || String(boxId),
          type: c.type || "box",
          status: c.status || "unknown",
          props: Array.isArray(c.props) ? c.props : [],
          labels: Array.isArray(c.labels) ? c.labels : [],
          parentId: c.parentId || null,
          metadata: { createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() },
        }, { merge: true });
      }
    }
  }

  return { ok: true, dryRun, committed: commit } as any;
});

export const setContainerParent = onCall({ region: "us-central1" }, async (req) => {
  const { boxId, parentId } = req.data || {};
  if (!boxId) throw new Error("boxId required");
  const db = admin.firestore();
  await db.collection("packingBoxes").doc(String(boxId)).set({ parentId: parentId || null }, { merge: true });
  return { ok: true } as any;
});

// Convenience HTTP wrappers (guarded by token) to run admin tasks from CLI
export const normalizeContainersHttp = onRequest({ region: "us-central1" }, async (req, res) => {
  try {
    const token = (req.query.token as string) || "";
    const commit = String((req.query.commit as any) || "false").toLowerCase() === "true";
    const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_CONFIG && (() => { try { return JSON.parse(String(process.env.FIREBASE_CONFIG)).projectId as string; } catch { return ""; } })() || "";
    if (!token || token !== projectId) { res.status(403).json({ ok: false, error: "forbidden" }); return; }
    const db = admin.firestore();
    const out: any[] = [];
    const lists = await db.collection("packLists").get();
    for (const doc of lists.docs) {
      const data = doc.data() as any;
      if (Array.isArray(data?.props) && typeof data?.name === "string" && !Array.isArray(data?.containers)) {
        const code = data.name;
        const boxId = data.id || doc.id;
        out.push({ action: "upsertBoxFromInlinePackListDoc", source: doc.id, target: boxId, code });
        if (commit) {
          await db.collection("packingBoxes").doc(boxId).set({
            id: boxId,
            code,
            name: data.name,
            type: data.type || "box",
            status: data.status || "unknown",
            props: Array.isArray(data.props) ? data.props : [],
            labels: Array.isArray(data.labels) ? data.labels : [],
            metadata: { createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() },
          }, { merge: true });
        }
        continue;
      }
      const containers = Array.isArray(data?.containers) ? data.containers : [];
      for (const c of containers) {
        if (!c || typeof c !== "object") continue;
        const boxId = c.id || c.code || c.name || undefined;
        if (!boxId) continue;
        out.push({ action: "upsertBoxFromContainersArray", source: doc.id, target: boxId });
        if (commit) {
          await db.collection("packingBoxes").doc(String(boxId)).set({
            id: String(boxId),
            code: c.code || undefined,
            name: c.name || String(boxId),
            type: c.type || "box",
            status: c.status || "unknown",
            props: Array.isArray(c.props) ? c.props : [],
            labels: Array.isArray(c.labels) ? c.labels : [],
            parentId: c.parentId || null,
            metadata: { createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() },
          }, { merge: true });
        }
      }
    }
    res.json({ ok: true, committed: commit, results: out });
  } catch (e) {
    logger.error("normalizeContainersHttp error", e as any);
    res.status(500).json({ ok: false });
  }
});

// Gen1 fallback endpoint for ease of invocation
export const adminNormalizeContainers = (functions as any).https.onRequest(async (req: any, res: any) => {
  try {
    const token = (req.query.token as string) || "";
    const commit = String((req.query.commit as any) || "false").toLowerCase() === "true";
    const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_CONFIG && (() => { try { return JSON.parse(String(process.env.FIREBASE_CONFIG)).projectId as string; } catch { return ""; } })() || "";
    if (!token || token !== projectId) { res.status(403).json({ ok: false, error: "forbidden" }); return; }
    const db = admin.firestore();
    const out: any[] = [];
    const lists = await db.collection("packLists").get();
    for (const doc of lists.docs) {
      const data = doc.data() as any;
      if (Array.isArray(data?.props) && typeof data?.name === "string" && !Array.isArray(data?.containers)) {
        const code = data.name;
        const boxId = data.id || doc.id;
        out.push({ action: "upsertBoxFromInlinePackListDoc", source: doc.id, target: boxId, code });
        if (commit) {
          await db.collection("packingBoxes").doc(boxId).set({
            id: boxId,
            code,
            name: data.name,
            type: data.type || "box",
            status: data.status || "unknown",
            props: Array.isArray(data.props) ? data.props : [],
            labels: Array.isArray(data.labels) ? data.labels : [],
            metadata: { createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() },
          }, { merge: true });
        }
        continue;
      }
      const containers = Array.isArray(data?.containers) ? data.containers : [];
      for (const c of containers) {
        if (!c || typeof c !== "object") continue;
        const boxId = c.id || c.code || c.name || undefined;
        if (!boxId) continue;
        out.push({ action: "upsertBoxFromContainersArray", source: doc.id, target: boxId });
        if (commit) {
          await db.collection("packingBoxes").doc(String(boxId)).set({
            id: String(boxId),
            code: c.code || undefined,
            name: c.name || String(boxId),
            type: c.type || "box",
            status: c.status || "unknown",
            props: Array.isArray(c.props) ? c.props : [],
            labels: Array.isArray(c.labels) ? c.labels : [],
            parentId: c.parentId || null,
            metadata: { createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() },
          }, { merge: true });
        }
      }
    }
    res.json({ ok: true, committed: commit, results: out });
  } catch (e) {
    logger.error("adminNormalizeContainers error", e as any);
    res.status(500).json({ ok: false });
  }
});

// --- Simple marketing waitlist collector ---
export const joinWaitlist = onRequest({ region: "us-central1" }, async (req, res) => {
  // Minimal CORS (allow marketing site origins)
  const origin = req.headers.origin || "";
  const allowedOrigins = [
    "https://thepropslist-marketing.web.app",
    "https://thepropslist.uk",
    "https://www.thepropslist.uk",
  ];
  if (allowedOrigins.includes(origin as string)) {
    res.setHeader("Access-Control-Allow-Origin", origin as string);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method-not-allowed" });
    return;
  }
  try {
    const body = (req.body || {}) as any;
    const email = (body.email || "").toString().trim().toLowerCase();
    const name = (body.name || "").toString().trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      res.status(400).json({ ok: false, error: "invalid-email" });
      return;
    }
    const doc = {
      email,
      name: name || null,
      createdAt: Date.now(),
      userAgent: req.headers["user-agent"] || null,
      referer: req.headers.referer || null,
      ip: (req.headers["x-forwarded-for"] as string) || null,
    } as any;
    await admin.firestore().collection("waitlist").add(doc);
    res.status(200).json({ ok: true });
  } catch (err) {
    logger.error("joinWaitlist error", { err });
    res.status(500).json({ ok: false });
  }
});

// --- Image Optimization Functions ---
import sharp from 'sharp';

// Image optimization function
export const optimizeImage = onRequest({ 
  region: "us-central1",
  timeoutSeconds: 60,
  memory: "1GiB"
}, async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { imageUrl, format = 'webp', quality = 80, width, height } = req.body;
    
    if (!imageUrl) {
      res.status(400).json({ error: "imageUrl is required" });
      return;
    }

    // Fetch the original image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    // Process with Sharp
    let sharpInstance = sharp(imageBuffer);
    
    // Resize if dimensions provided
    if (width || height) {
      sharpInstance = sharpInstance.resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }
    
    // Convert to requested format
    let outputBuffer: Buffer;
    let contentType: string;
    
    switch (format.toLowerCase()) {
      case 'webp':
        outputBuffer = await sharpInstance
          .webp({ quality, effort: 6 })
          .toBuffer();
        contentType = 'image/webp';
        break;
      case 'jpeg':
      case 'jpg':
        outputBuffer = await sharpInstance
          .jpeg({ quality, progressive: true })
          .toBuffer();
        contentType = 'image/jpeg';
        break;
      case 'png':
        outputBuffer = await sharpInstance
          .png({ quality, progressive: true })
          .toBuffer();
        contentType = 'image/png';
        break;
      case 'avif':
        outputBuffer = await sharpInstance
          .avif({ quality, effort: 6 })
          .toBuffer();
        contentType = 'image/avif';
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
    
    // Upload optimized image to Firebase Storage
    const bucket = admin.storage().bucket();
    const fileName = `optimized/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${format}`;
    const file = bucket.file(fileName);
    
    await file.save(outputBuffer, {
      metadata: {
        contentType,
        cacheControl: 'public, max-age=31536000', // 1 year cache
        metadata: {
          originalUrl: imageUrl,
          optimizedAt: new Date().toISOString(),
          format,
          quality: quality.toString()
        }
      }
    });
    
    // Make file publicly accessible
    await file.makePublic();
    
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    
    res.json({
      success: true,
      optimizedUrl: publicUrl,
      originalSize: imageBuffer.length,
      optimizedSize: outputBuffer.length,
      compressionRatio: Math.round((1 - outputBuffer.length / imageBuffer.length) * 100),
      format,
      quality
    });
    
  } catch (error) {
    logger.error("Image optimization error", { error });
    res.status(500).json({ 
      error: "Image optimization failed",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Batch image optimization for existing images
export const batchOptimizeImages = onCall({ region: "us-central1" }, async (req) => {
  if (!req.auth) throw new Error("unauthenticated");
  
  const { collection = 'props', limit = 10, format = 'webp', quality = 80 } = req.data || {};
  
  const db = admin.firestore();
  const snapshot = await db.collection(collection)
    .where('images', '!=', null)
    .limit(limit)
    .get();
  
  const results = [];
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const images = data.images || [];
    
    for (const image of images) {
      if (image.url && !image.optimizedUrl) {
        try {
          // Call the optimization function
          const response = await fetch(`${process.env.FUNCTIONS_URL || 'http://localhost:5001'}/optimizeImage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageUrl: image.url,
              format,
              quality
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            results.push({
              docId: doc.id,
              imageId: image.id,
              originalUrl: image.url,
              optimizedUrl: result.optimizedUrl,
              compressionRatio: result.compressionRatio
            });
            
            // Update the document with optimized URL
            await doc.ref.update({
              [`images.${images.indexOf(image)}.optimizedUrl`]: result.optimizedUrl
            });
          }
        } catch (error) {
          logger.error("Batch optimization error", { docId: doc.id, imageId: image.id, error });
        }
      }
    }
  }
  
  return { 
    success: true, 
    processed: results.length,
    results 
  };
});

// --- Add-Ons Management Functions ---

// Purchase an add-on
export const purchaseAddOn = onCall({ region: "us-central1" }, async (req) => {
  try {
    if (!req.auth) throw new Error("unauthenticated");
    const s = await ensureStripe();
    if (!s) throw new Error("Stripe not configured");
    
    const { userId, addOnId, billingInterval } = req.data || {};
    if (!userId || !addOnId || !billingInterval) {
      throw new Error("Missing required parameters");
    }
  
  const db = admin.firestore();
  const profileRef = db.doc(`userProfiles/${userId}`);
  const profileSnap = await profileRef.get();
  const profile = profileSnap.exists ? (profileSnap.data() as any) : {};
  
  // Check if user has Standard or Pro plan
  const userPlan = profile.plan || profile.subscriptionPlan;
  if (!['standard', 'pro'].includes(userPlan)) {
    throw new Error("Add-ons are only available for Standard and Pro plans");
  }
  
  // Get user's Stripe customer ID
  let customerId = profile.stripeCustomerId;
  if (!customerId) {
    const user = await admin.auth().getUser(userId).catch(() => undefined);
    const email = (profile?.email || user?.email) as string | undefined;
    if (email) {
      const list = await s.customers.list({ email, limit: 1 });
      customerId = list.data[0]?.id;
    }
  }
  
  if (!customerId) {
    throw new Error("No Stripe customer found");
  }
  
  // Get user's subscription
  const subscriptionId = profile.subscriptionId;
  if (!subscriptionId) {
    throw new Error("No active subscription found");
  }
  
  // Get add-on product from Stripe
  const products = await s.products.list({ active: true, type: 'service' });
  const addOnProduct = products.data.find(p => p.metadata?.addon_id === addOnId);
  
  if (!addOnProduct) {
    throw new Error("Add-on product not found");
  }
  
  // Get the appropriate price for the billing interval
  const prices = await s.prices.list({ active: true, product: addOnProduct.id });
  const price = prices.data.find(p => 
    p.recurring?.interval === billingInterval && 
    p.metadata?.addon_id === addOnId
  );
  
  if (!price) {
    throw new Error("Add-on price not found");
  }
  
  // Add the add-on to the subscription
  const subscription = await s.subscriptions.retrieve(subscriptionId);
  const subscriptionItem = await s.subscriptionItems.create({
    subscription: subscriptionId,
    price: price.id,
    quantity: 1,
    metadata: {
      addon_id: addOnId,
      addon_type: addOnProduct.metadata?.addon_type || 'unknown',
      addon_quantity: addOnProduct.metadata?.addon_quantity || '1',
    }
  });
  
  // Create UserAddOn record in Firestore
  const userAddOnRef = db.collection('userAddOns').doc();
  await userAddOnRef.set({
    id: userAddOnRef.id,
    userId,
    addOnId,
    quantity: parseInt(addOnProduct.metadata?.addon_quantity || '1'),
    status: 'active',
    billingInterval,
    stripeSubscriptionItemId: subscriptionItem.id,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  return { 
    success: true, 
    subscriptionItemId: subscriptionItem.id,
    userAddOnId: userAddOnRef.id
  } as any;
  } catch (error) {
    reportError(error, 'purchaseAddOn', req.auth?.uid);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    } as any;
  }
});

// Cancel an add-on
export const cancelAddOn = onCall({ region: "us-central1" }, async (req) => {
  try {
    if (!req.auth) throw new Error("unauthenticated");
    const s = await ensureStripe();
    if (!s) throw new Error("Stripe not configured");
    
    const { userId, userAddOnId } = req.data || {};
    if (!userId || !userAddOnId) {
      throw new Error("Missing required parameters");
    }
  
  const db = admin.firestore();
  const userAddOnRef = db.doc(`userAddOns/${userAddOnId}`);
  const userAddOnSnap = await userAddOnRef.get();
  
  if (!userAddOnSnap.exists) {
    throw new Error("Add-on not found");
  }
  
  const userAddOn = userAddOnSnap.data() as any;
  if (userAddOn.userId !== userId) {
    throw new Error("Unauthorized");
  }
  
  if (userAddOn.status !== 'active') {
    throw new Error("Add-on is not active");
  }
  
  // Cancel the subscription item in Stripe
  await s.subscriptionItems.update(userAddOn.stripeSubscriptionItemId, {
    cancel_at_period_end: true
  });
  
  // Update the UserAddOn record
  await userAddOnRef.update({
    status: 'cancelled',
    cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  return { success: true } as any;
  } catch (error) {
    reportError(error, 'cancelAddOn', req.auth?.uid);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    } as any;
  }
});

// Get add-ons for marketing site
export const getAddOnsForMarketing = onRequest({ region: "us-central1" }, async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  
  try {
    const s = await ensureStripe();
    if (!s) {
      // Return default add-ons if Stripe is not configured
      const defaultAddOns = [
        {
          id: 'shows_5',
          type: 'shows',
          name: '5 Additional Shows',
          description: 'Add 5 more shows to your account',
          quantity: 5,
          targetPlans: ['standard', 'pro'],
          popular: true,
          monthlyPrice: 12,
          yearlyPrice: 120,
        },
        {
          id: 'props_100',
          type: 'props',
          name: '100 Additional Props',
          description: 'Add 100 more props to your account',
          quantity: 100,
          targetPlans: ['standard', 'pro'],
          popular: true,
          monthlyPrice: 4,
          yearlyPrice: 40,
        },
        {
          id: 'packing_100',
          type: 'packing_boxes',
          name: '100 Additional Packing Boxes',
          description: 'Add 100 more packing boxes to your account',
          quantity: 100,
          targetPlans: ['standard', 'pro'],
          monthlyPrice: 2,
          yearlyPrice: 20,
        },
        {
          id: 'archived_5',
          type: 'archived_shows',
          name: '5 Additional Archived Shows',
          description: 'Add 5 more archived shows to your account',
          quantity: 5,
          targetPlans: ['standard', 'pro'],
          monthlyPrice: 2,
          yearlyPrice: 20,
        },
      ];
      
      res.json({ addOns: defaultAddOns });
      return;
    }
    
    // Fetch add-on products from Stripe
    const products = await s.products.list({ 
      active: true, 
      type: 'service',
      limit: 100 
    });
    
    const addOnProducts = products.data.filter(product => 
      product.metadata?.addon_type && 
      product.metadata?.addon_id
    );
    
    const addOns = [];
    
    for (const product of addOnProducts) {
      const prices = await s.prices.list({ 
        active: true, 
        product: product.id 
      });
      
      const monthlyPrice = prices.data.find(p => p.recurring?.interval === 'month');
      const yearlyPrice = prices.data.find(p => p.recurring?.interval === 'year');
      
      addOns.push({
        id: product.metadata.addon_id,
        type: product.metadata.addon_type,
        name: product.name,
        description: product.description || '',
        quantity: parseInt(product.metadata.addon_quantity || '1'),
        targetPlans: product.metadata.addon_target_plans?.split(',') || ['standard', 'pro'],
        popular: product.metadata.addon_popular === 'true',
        monthlyPrice: monthlyPrice ? (monthlyPrice.unit_amount || 0) / 100 : 0,
        yearlyPrice: yearlyPrice ? (yearlyPrice.unit_amount || 0) / 100 : 0,
        stripeProductId: product.id,
        stripePriceIdMonthly: monthlyPrice?.id,
        stripePriceIdYearly: yearlyPrice?.id,
      });
    }
    
    res.json({ addOns });
    
  } catch (error) {
    logger.error('Error fetching add-ons for marketing:', error);
    res.status(500).json({ error: 'Failed to fetch add-ons' });
  }
});

// Export the contact form function
export { submitContactForm } from './contact.js';


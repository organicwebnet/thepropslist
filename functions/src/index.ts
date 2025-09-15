import { onCall, onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import fetch from "cross-fetch";
import * as logger from "firebase-functions/logger";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Stripe from "stripe";

// Initialize Admin SDK once
try {
  admin.initializeApp();
} catch (e) {
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
// Read from environment variables OR functions config (set via `firebase functions:config:set feedback.github_token=...`)
const runtimeConfig = (functions as any)?.config ? (functions as any).config() : {};
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.FEEDBACK_GITHUB_TOKEN || runtimeConfig?.feedback?.github_token;
const GITHUB_REPO = process.env.GITHUB_REPO || process.env.FEEDBACK_GITHUB_REPO || runtimeConfig?.feedback?.github_repo || "";

export const onFeedbackCreated = onDocumentCreated("feedback/{id}", async (event) => {
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

// --- Stripe Billing (Webhook + Customer Portal) ---
const cfg = (functions as any)?.config ? (functions as any).config() : {};
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || cfg?.stripe?.secret;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || cfg?.stripe?.webhook_secret;
// Optional price ids if you want to map to friendly plan names
const PRICE_STARTER = process.env.PRICE_STARTER || cfg?.stripe?.plan_starter_price;
const PRICE_STANDARD = process.env.PRICE_STANDARD || cfg?.stripe?.plan_standard_price;
const PRICE_PRO = process.env.PRICE_PRO || cfg?.stripe?.plan_pro_price;

let stripe: Stripe | null = null;
if (STRIPE_SECRET_KEY) {
  stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20" as any,
  });
} else {
  logger.warn("Stripe secret key not configured; billing endpoints will be inert.");
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
    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
      res.status(200).send("stripe not configured");
      return;
    }
    const sig = req.headers["stripe-signature"] as string;
    const event = stripe.webhooks.constructEvent(req.rawBody, sig, STRIPE_WEBHOOK_SECRET);

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
          if (subscriptionId && stripe) {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
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
          if (stripe && customerId) {
            const cust = await stripe.customers.retrieve(customerId);
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
          if (stripe && customerId) {
            const cust = await stripe.customers.retrieve(customerId);
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
  if (!stripe) throw new Error("Stripe not configured");
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
    if (email && stripe) {
      const list = await stripe.customers.list({ email, limit: 1 });
      if (list.data.length > 0) customerId = list.data[0].id;
    }
    if (customerId) await profileRef.set({ stripeCustomerId: customerId }, { merge: true });
  }
  if (!customerId) throw new Error("No Stripe customer");

  const returnUrl = process.env.BILLING_RETURN_URL || cfg?.app?.billing_return_url || "https://app.thepropslist.uk/profile";
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return { url: session.url } as any;
});

// --- Public container info for marketing site (/c/:id) ---
export const publicContainerInfo = onRequest({ region: "us-central1" }, async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  const id = (req.query.id as string) || "";
  if (!id) {
    res.status(400).json({ error: "missing id" });
    return;
  }
  try {
    const snap = await admin.firestore().collection("packLists").get();
    let found: any = null;
    snap.forEach((doc) => {
      if (found) return;
      const data = doc.data();
      const containers = Array.isArray(data.containers) ? data.containers : [];
      const match = containers.find((c: any) => c && c.id === id);
      if (match) found = match;
    });
    if (!found) {
      res.status(404).json({ error: "not found" });
      return;
    }
    const publicData = {
      id,
      name: found.name || "Container",
      status: found.status || "unknown",
      propCount: Array.isArray(found.props) ? found.props.reduce((s: number, p: any) => s + (p.quantity || 0), 0) : 0,
      props: Array.isArray(found.props)
        ? found.props.slice(0, 50).map((p: any) => ({ name: p.name || "", quantity: p.quantity || 0 }))
        : [],
    } as any;
    res.json(publicData);
  } catch (err) {
    logger.error("publicContainerInfo error", { err });
    res.status(500).json({ error: "internal" });
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


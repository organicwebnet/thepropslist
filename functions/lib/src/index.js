"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupOrphanedStorage = exports.databaseHealthCheck = exports.manualCleanup = exports.cleanupFailedEmails = exports.cleanupExpiredCodes = exports.cleanupOldEmails = exports.deleteShowWithAdminPrivileges = exports.submitContactForm = exports.getAddOnsForMarketing = exports.cancelAddOn = exports.purchaseAddOn = exports.batchOptimizeImages = exports.optimizeImage = exports.joinWaitlist = exports.adminNormalizeContainers = exports.normalizeContainersHttp = exports.setContainerParent = exports.normalizeContainers = exports.publicContainerInfoLegacyV1 = exports.publicContainerInfo = exports.getSubscriptionStats = exports.seedRoleBasedTestUsers = exports.seedTestUsers = exports.getPricingConfig = exports.getStripePromotionCodes = exports.getStripeCoupons = exports.createStripePromotionCode = exports.createStripeCoupon = exports.updateUserPasswordWithCode = exports.sendCustomPasswordResetEmail = exports.createCheckoutSession = exports.createBillingPortalSession = exports.stripeWebhook = exports.feedbackToGithubEU = exports.feedbackIssueBridge = exports.sendEmailDirect = exports.processEmail = exports.sendInviteEmail = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger = __importStar(require("firebase-functions/logger"));
const functions = __importStar(require("firebase-functions"));
const functionsV1 = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const nodemailer = __importStar(require("nodemailer"));
// Inline pricing configuration to avoid import issues
const DEFAULT_PRICING_CONFIG = {
    currency: 'USD',
    billingInterval: 'monthly',
    plans: [
        {
            id: 'free',
            name: 'Free',
            description: 'Perfect for getting started',
            price: 0,
            interval: 'monthly',
            features: [
                '1 Show', '2 Task Boards', '20 Packing Boxes',
                '3 Collaborators per Show', '10 Props', 'No Archived Shows', 'Basic Support'
            ],
            limits: {
                shows: 1,
                boards: 2,
                packingBoxes: 20,
                collaborators: 3,
                props: 10,
                archivedShows: 0
            }
        },
        {
            id: 'starter',
            name: 'Starter',
            description: 'Great for small productions',
            price: 9.99,
            interval: 'monthly',
            features: [
                '3 Shows', '5 Task Boards', '200 Packing Boxes',
                '5 Collaborators per Show', '50 Props', '2 Archived Shows', 'Email Support'
            ],
            limits: {
                shows: 3,
                boards: 5,
                packingBoxes: 200,
                collaborators: 5,
                props: 50,
                archivedShows: 2
            }
        },
        {
            id: 'standard',
            name: 'Standard',
            description: 'Perfect for growing productions',
            price: 29.99,
            interval: 'monthly',
            features: [
                '10 Shows', '20 Task Boards', '1000 Packing Boxes',
                '15 Collaborators per Show', '100 Props', '5 Archived Shows', 'Priority Support',
                'Custom Branding'
            ],
            limits: {
                shows: 10,
                boards: 20,
                packingBoxes: 1000,
                collaborators: 15,
                props: 100,
                archivedShows: 5
            }
        },
        {
            id: 'pro',
            name: 'Pro',
            description: 'For large productions and teams',
            price: 99.99,
            interval: 'monthly',
            features: [
                '100 Shows', '200 Task Boards', '10000 Packing Boxes',
                '100 Collaborators per Show', '1000 Props', '10 Archived Shows', '24/7 Support',
                'Custom Branding'
            ],
            limits: {
                shows: 100,
                boards: 200,
                packingBoxes: 10000,
                collaborators: 100,
                props: 1000,
                archivedShows: 10
            }
        }
    ]
};
// Error reporting service
const reportError = (error, context, userId) => {
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
// Initialize Admin SDK - robust approach for Cloud Functions v2
try {
    if (!admin.apps || admin.apps.length === 0) {
        // In Cloud Functions, the default service account is automatically used
        admin.initializeApp();
    }
}
catch (error) {
    console.error("Firebase Admin initialization error:", error);
}
// Providers: Gmail SMTP (preferred), Brevo, or MailerSend (fallback)
// Gmail SMTP configuration - will be set via secrets
let GMAIL_USER;
let GMAIL_PASS;
// Initialize secrets
const initializeSecrets = async () => {
    try {
        const { defineSecret } = await Promise.resolve().then(() => __importStar(require("firebase-functions/params")));
        const gmailUserSecret = defineSecret("GMAIL_USER");
        const gmailPassSecret = defineSecret("GMAIL_PASS");
        GMAIL_USER = gmailUserSecret.value();
        GMAIL_PASS = gmailPassSecret.value();
    }
    catch (error) {
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
    logger.warn("Brevo secrets not set (BREVO_API_KEY, BREVO_FROM_EMAIL). Will fallback to MailerSend if configured.");
}
exports.sendInviteEmail = (0, https_1.onCall)(async (req) => {
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
//   GITHUB_REPO:  "owner/repo" (e.g., organicwebnet/thepropslist)
// Read from environment variables
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.FEEDBACK_GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || process.env.FEEDBACK_GITHUB_REPO || "";
// NOTE: use a unique name to avoid collisions with existing HTTP functions
// Email processing function for verification codes and invites
exports.processEmail = (0, firestore_1.onDocumentCreated)({
    document: "emails/{id}",
    region: "us-central1",
    timeoutSeconds: 60,
    memory: "256MiB",
    secrets: ["GMAIL_USER", "GMAIL_PASS"]
}, async (event) => {
    // Initialize secrets first
    await initializeSecrets();
    const snap = event.data;
    if (!snap)
        return;
    const id = event.params?.id;
    const data = snap.data();
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
    const _fromEmail = from.email;
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
                logger.error("Brevo send failed", { status: res.status, text, id });
                await snap.ref.set({
                    delivery: {
                        state: "failed",
                        error: `Brevo error: ${res.status}`,
                        failedAt: admin.firestore.FieldValue.serverTimestamp()
                    }
                }, { merge: true });
                return;
            }
            const result = await res.json();
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
                logger.error("MailerSend send failed", { status: res.status, text, id });
                await snap.ref.set({
                    delivery: {
                        state: "failed",
                        error: `MailerSend error: ${res.status}`,
                        failedAt: admin.firestore.FieldValue.serverTimestamp()
                    }
                }, { merge: true });
                return;
            }
            const result = await res.json();
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
    }
    catch (err) {
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
exports.sendEmailDirect = (0, https_1.onRequest)({
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
        const _fromEmail = from.email;
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
            };
            const response = await fetch("https://api.brevo.com/v3/smtp/email", {
                method: "POST",
                headers: {
                    "api-key": BREVO_API_KEY,
                    "Content-Type": "application/json",
                    accept: "application/json",
                },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                const errorText = await response.text().catch(() => "");
                logger.error("Brevo send failed", { status: response.status, errorText });
                res.status(500).json({ error: "Email sending failed" });
                return;
            }
            const result = await response.json();
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
            };
            const response = await fetch("https://api.mailersend.com/v1/email", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${MS_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                const errorText = await response.text().catch(() => "");
                logger.error("MailerSend send failed", { status: response.status, errorText });
                res.status(500).json({ error: "Email sending failed" });
                return;
            }
            const result = await response.json();
            logger.info("Email sent via MailerSend", { toEmail, messageId: result?.message_id });
            res.json({ success: true, provider: "mailersend", messageId: result?.message_id });
            return;
        }
        // No email provider configured
        logger.error("No email provider configured (Brevo or MailerSend)", { toEmail });
        res.status(500).json({ error: "No email provider configured" });
    }
    catch (err) {
        logger.error("Direct email sending error", { err });
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.feedbackIssueBridge = (0, firestore_1.onDocumentCreated)("feedback/{id}", async (event) => {
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
// EU-region Firestore trigger to match Firestore (eur3) and avoid Eventarc/Run region mismatch
// NOTE: renamed (EU) to avoid function type-change collisions
exports.feedbackToGithubEU = functionsV1
    .region('europe-west1')
    .firestore.document('feedback/{id}')
    .onCreate(async (snap, context) => {
    try {
        const id = context?.params?.id;
        const data = snap.data();
        const runtimeConfig = functions?.config ? functions.config() : {};
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.FEEDBACK_GITHUB_TOKEN || runtimeConfig?.feedback?.github_token;
        const GITHUB_REPO = process.env.GITHUB_REPO || process.env.FEEDBACK_GITHUB_REPO || runtimeConfig?.feedback?.github_repo || "";
        if (!GITHUB_TOKEN || !GITHUB_REPO) {
            logger.warn("GitHub integration not configured; skipping issue creation", { id });
            return;
        }
        if (data?.githubIssueNumber)
            return; // already processed
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
        const labels = [];
        if (data?.type)
            labels.push(String(data.type));
        if (data?.severity)
            labels.push(`sev:${data.severity}`);
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
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            logger.error("GitHub issue creation failed (EU)", { status: res.status, text });
            return;
        }
        const json = await res.json();
        const issueNumber = json?.number;
        const issueUrl = json?.html_url;
        await admin.firestore().doc(`feedback/${id}`).set({ githubIssueNumber: issueNumber, githubIssueUrl: issueUrl, status: "open" }, { merge: true });
        logger.info("Created GitHub issue from feedback (EU)", { id, issueNumber });
    }
    catch (err) {
        logger.error("onFeedbackCreatedEU error", { err });
    }
});
// --- Stripe Billing (Webhook + Customer Portal) ---
// Initialize secrets
let STRIPE_SECRET_KEY;
let STRIPE_WEBHOOK_SECRET;
let PRICE_STARTER;
let PRICE_STANDARD;
let PRICE_PRO;
const initializeStripeSecrets = async () => {
    try {
        const { defineSecret } = await Promise.resolve().then(() => __importStar(require("firebase-functions/params")));
        const stripeSecretKeySecret = defineSecret("STRIPE_SECRET_KEY");
        const stripeWebhookSecretSecret = defineSecret("STRIPE_WEBHOOK_SECRET");
        const priceStarterSecret = defineSecret("PRICE_STARTER");
        const priceStandardSecret = defineSecret("PRICE_STANDARD");
        const priceProSecret = defineSecret("PRICE_PRO");
        STRIPE_SECRET_KEY = stripeSecretKeySecret.value();
        STRIPE_WEBHOOK_SECRET = stripeWebhookSecretSecret.value();
        PRICE_STARTER = priceStarterSecret.value();
        PRICE_STANDARD = priceStandardSecret.value();
        PRICE_PRO = priceProSecret.value();
    }
    catch (error) {
        logger.warn("Failed to initialize Stripe secrets, using environment variables", { error });
        STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
        STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
        PRICE_STARTER = process.env.PRICE_STARTER;
        PRICE_STANDARD = process.env.PRICE_STANDARD;
        PRICE_PRO = process.env.PRICE_PRO;
    }
};
let stripe = null;
async function ensureStripe() {
    if (stripe)
        return stripe;
    if (!STRIPE_SECRET_KEY) {
        logger.warn("Stripe secret key not configured; billing endpoints will be inert.");
        return null;
    }
    const mod = await Promise.resolve().then(() => __importStar(require("stripe")));
    const StripeCtor = mod.default;
    stripe = new StripeCtor(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
    return stripe;
}
function mapPlan(priceId) {
    if (!priceId)
        return undefined;
    if (PRICE_STARTER && priceId === PRICE_STARTER)
        return "starter";
    if (PRICE_STANDARD && priceId === PRICE_STANDARD)
        return "standard";
    if (PRICE_PRO && priceId === PRICE_PRO)
        return "pro";
    return undefined;
}
exports.stripeWebhook = (0, https_1.onRequest)({ region: "us-central1" }, async (req, res) => {
    try {
        const s = await ensureStripe();
        if (!s || !STRIPE_WEBHOOK_SECRET) {
            res.status(200).send("stripe not configured");
            return;
        }
        const sig = req.headers["stripe-signature"];
        const event = s.webhooks.constructEvent(req.rawBody, sig, STRIPE_WEBHOOK_SECRET);
        // Helper to upsert profile by email
        const upsertByEmail = async (email, data) => {
            const snap = await admin.firestore().collection("userProfiles").where("email", "==", email).limit(1).get();
            if (snap.empty)
                return;
            const doc = snap.docs[0];
            await doc.ref.set(data, { merge: true });
        };
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object;
                const customerId = session.customer || "";
                const subscriptionId = session.subscription || "";
                const email = session.customer_details?.email || session.client_reference_id || "";
                let planPriceId;
                try {
                    if (subscriptionId && s) {
                        const sub = await s.subscriptions.retrieve(subscriptionId);
                        planPriceId = sub.items.data[0]?.price?.id;
                    }
                }
                catch { }
                const plan = mapPlan(planPriceId);
                const update = {
                    stripeCustomerId: customerId || undefined,
                    subscriptionId: subscriptionId || undefined,
                    planPriceId: planPriceId || undefined,
                    plan: plan || undefined,
                    subscriptionStatus: session.status || "active",
                    currentPeriodEnd: session.expires_at || undefined,
                    lastStripeEventTs: Date.now(),
                };
                if (email)
                    await upsertByEmail(email, update);
                break;
            }
            case "customer.subscription.updated":
            case "customer.subscription.deleted": {
                const sub = event.data.object;
                const customerId = sub.customer || "";
                const status = sub.status;
                const planPriceId = sub.items.data[0]?.price?.id;
                const plan = mapPlan(planPriceId);
                const currentPeriodEnd = typeof sub.current_period_end === "number" ? sub.current_period_end : undefined;
                // Lookup customer email to find profile
                let email = "";
                try {
                    if (s && customerId) {
                        const cust = await s.customers.retrieve(customerId);
                        email = cust?.email || "";
                    }
                }
                catch { }
                const update = {
                    stripeCustomerId: customerId || undefined,
                    subscriptionId: sub.id,
                    subscriptionStatus: status,
                    planPriceId: planPriceId || undefined,
                    plan: plan || undefined,
                    currentPeriodEnd,
                    cancelAtPeriodEnd: sub.cancel_at_period_end || false,
                    lastStripeEventTs: Date.now(),
                };
                if (email) {
                    const snap = await admin.firestore().collection("userProfiles").where("email", "==", email).limit(1).get();
                    if (!snap.empty)
                        await snap.docs[0].ref.set(update, { merge: true });
                }
                break;
            }
            case "invoice.payment_succeeded":
            case "invoice.payment_failed": {
                const invoice = event.data.object;
                const customerId = invoice.customer || "";
                let email = "";
                try {
                    if (s && customerId) {
                        const cust = await s.customers.retrieve(customerId);
                        email = cust?.email || "";
                    }
                }
                catch { }
                if (email) {
                    await upsertByEmail(email, { lastStripeEventTs: Date.now() });
                }
                break;
            }
            default:
                break;
        }
        res.status(200).send("ok");
    }
    catch (err) {
        logger.error("stripe webhook error", { err });
        res.status(400).send(`webhook error`);
    }
});
exports.createBillingPortalSession = (0, https_1.onCall)({
    region: "us-central1",
    secrets: ["STRIPE_SECRET_KEY"]
}, async (req) => {
    if (!req.auth)
        throw new Error("unauthenticated");
    await initializeStripeSecrets();
    const s = await ensureStripe();
    if (!s)
        throw new Error("Stripe not configured");
    const uid = req.auth.uid;
    const db = admin.firestore();
    const profileRef = db.doc(`userProfiles/${uid}`);
    const profileSnap = await profileRef.get();
    const profile = profileSnap.exists ? profileSnap.data() : {};
    let customerId = profile?.stripeCustomerId;
    if (!customerId) {
        // Try to find by email
        const user = await admin.auth().getUser(uid).catch(() => undefined);
        const email = (profile?.email || user?.email);
        if (email && s) {
            const list = await s.customers.list({ email, limit: 1 });
            if (list.data.length > 0)
                customerId = list.data[0].id;
        }
        if (customerId)
            await profileRef.set({ stripeCustomerId: customerId }, { merge: true });
    }
    if (!customerId)
        throw new Error("No Stripe customer");
    const returnUrl = process.env.BILLING_RETURN_URL || "https://app.thepropslist.uk/profile";
    const session = await s.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
    });
    return { url: session.url };
});
// --- Create Stripe Checkout session for new/upgrades ---
exports.createCheckoutSession = (0, https_1.onCall)({
    region: "us-central1",
    secrets: ["STRIPE_SECRET_KEY"]
}, async (req) => {
    if (!req.auth)
        throw new Error("unauthenticated");
    await initializeStripeSecrets();
    const s = await ensureStripe();
    if (!s)
        throw new Error("Stripe not configured");
    const uid = req.auth.uid;
    const priceId = String(req.data?.priceId || "").trim();
    if (!priceId)
        throw new Error("priceId required");
    const db = admin.firestore();
    const profileRef = db.doc(`userProfiles/${uid}`);
    const snap = await profileRef.get();
    const profile = snap.exists ? snap.data() : {};
    // Ensure customer by email
    const user = await admin.auth().getUser(uid).catch(() => undefined);
    const email = (profile?.email || user?.email);
    let customerId = profile?.stripeCustomerId;
    if (!customerId && email) {
        const list = await s.customers.list({ email, limit: 1 });
        customerId = list.data[0]?.id;
    }
    if (!customerId && email) {
        const cust = await s.customers.create({ email });
        customerId = cust.id;
    }
    if (customerId)
        await profileRef.set({ stripeCustomerId: customerId }, { merge: true });
    const successUrl = process.env.CHECKOUT_SUCCESS_URL || "https://app.thepropslist.uk/profile";
    const cancelUrl = process.env.CHECKOUT_CANCEL_URL || "https://app.thepropslist.uk/profile";
    const session = await s.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: true,
    });
    return { url: session.url };
});
// Localization helper function
function getLocalizedEmailContent(resetUrl, locale = 'en') {
    const translations = {
        en: {
            subject: "Reset Your Password - The Props List",
            title: "Reset Your Password",
            description: "We received a request to reset your password for your The Props List account. Click the button below to reset your password:",
            buttonText: "Reset Password",
            linkText: "If the button doesn't work, copy and paste this link into your browser:",
            expiryText: "This link will expire in 24 hours. If you didn't request this password reset, you can safely ignore this email.",
            footer: "© 2025 The Props List. All rights reserved."
        },
        es: {
            subject: "Restablecer tu Contraseña - The Props List",
            title: "Restablecer tu Contraseña",
            description: "Recibimos una solicitud para restablecer tu contraseña de tu cuenta de The Props List. Haz clic en el botón de abajo para restablecer tu contraseña:",
            buttonText: "Restablecer Contraseña",
            linkText: "Si el botón no funciona, copia y pega este enlace en tu navegador:",
            expiryText: "Este enlace expirará en 24 horas. Si no solicitaste este restablecimiento de contraseña, puedes ignorar este correo de forma segura.",
            footer: "© 2025 The Props List. Todos los derechos reservados."
        },
        fr: {
            subject: "Réinitialiser votre Mot de Passe - The Props List",
            title: "Réinitialiser votre Mot de Passe",
            description: "Nous avons reçu une demande de réinitialisation de votre mot de passe pour votre compte The Props List. Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe:",
            buttonText: "Réinitialiser le Mot de Passe",
            linkText: "Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur:",
            expiryText: "Ce lien expirera dans 24 heures. Si vous n'avez pas demandé cette réinitialisation de mot de passe, vous pouvez ignorer cet e-mail en toute sécurité.",
            footer: "© 2025 The Props List. Tous droits réservés."
        }
    };
    const t = translations[locale] || translations.en;
    const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #111; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">The Props List</h1>
      </div>
      <div style="padding: 40px 20px; background: #f8f9fa;">
        <h2 style="color: #333; margin-bottom: 20px;">${t.title}</h2>
        <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
          ${t.description}
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            ${t.buttonText}
          </a>
        </div>
        <p style="color: #666; line-height: 1.6; font-size: 14px;">
          ${t.linkText}<br>
          <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          ${t.expiryText}
        </p>
      </div>
      <div style="background: #333; color: #999; padding: 20px; text-align: center; font-size: 12px;">
        ${t.footer}
      </div>
    </div>
  `;
    const text = `
${t.subject}

${t.description}

${t.buttonText}: ${resetUrl}

${t.expiryText}

${t.footer}
  `;
    return { subject: t.subject, html, text };
}
// --- Custom Password Reset Function ---
exports.sendCustomPasswordResetEmail = (0, https_1.onCall)({
    region: "us-central1",
    secrets: ["GMAIL_USER", "GMAIL_PASS"]
}, async (req) => {
    try {
        const { email, locale = 'en' } = req.data || {};
        if (!email) {
            throw new functions.https.HttpsError('invalid-argument', 'Email is required');
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid email format');
        }
        // Initialize secrets first
        await initializeSecrets();
        // Rate limiting: Check if user has made too many requests
        const db = admin.firestore();
        const oneHourAgo = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 60 * 60 * 1000));
        const recentRequests = await db.collection('passwordResetRequests')
            .where('email', '==', email)
            .where('requestedAt', '>=', oneHourAgo)
            .get();
        const MAX_REQUESTS_PER_HOUR = 3;
        if (recentRequests.docs.length >= MAX_REQUESTS_PER_HOUR) {
            throw new functions.https.HttpsError('resource-exhausted', 'Too many password reset requests. Please wait before trying again.');
        }
        // Log this request for rate limiting
        await db.collection('passwordResetRequests').add({
            email,
            requestedAt: admin.firestore.FieldValue.serverTimestamp(),
            ipAddress: req.rawRequest?.ip || 'unknown'
        });
        // Check if there's already an unused token for this email
        const existingTokens = await db.collection('passwordResetTokens')
            .where('email', '==', email)
            .where('used', '==', false)
            .where('expiresAt', '>', admin.firestore.Timestamp.now())
            .get();
        // Invalidate existing tokens
        if (!existingTokens.empty) {
            const batch = db.batch();
            existingTokens.docs.forEach(doc => {
                batch.update(doc.ref, { used: true, invalidatedAt: admin.firestore.FieldValue.serverTimestamp() });
            });
            await batch.commit();
        }
        // Generate a secure password reset token
        const crypto = require('crypto');
        const resetToken = crypto.randomBytes(32).toString('hex');
        // Store the reset token in Firestore with expiration
        await db.collection('passwordResetTokens').doc(resetToken).set({
            email,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)), // 24 hours
            used: false,
            ipAddress: req.rawRequest?.ip || 'unknown'
        });
        // Create the reset URL
        const resetUrl = `https://app.thepropslist.uk/reset-password?token=${resetToken}`;
        // Create localized email content
        const emailContent = getLocalizedEmailContent(resetUrl, locale);
        const subject = emailContent.subject;
        const html = emailContent.html;
        const text = emailContent.text;
        // Send email using your existing email infrastructure
        if (GMAIL_USER && GMAIL_PASS) {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: GMAIL_USER,
                    pass: GMAIL_PASS
                }
            });
            const mailOptions = {
                from: `"The Props List" <${GMAIL_USER}>`,
                to: email,
                subject: subject,
                html: html,
                text: text
            };
            await transporter.sendMail(mailOptions);
            logger.info("Custom password reset email sent via Gmail SMTP", { email });
            return { success: true, message: "Password reset email sent successfully" };
        }
        else {
            // Fallback to Brevo if Gmail not configured
            if (BREVO_API_KEY && BREVO_FROM_EMAIL) {
                const body = {
                    sender: { email: BREVO_FROM_EMAIL, name: "The Props List" },
                    to: [{ email }],
                    subject,
                    htmlContent: html,
                    textContent: text,
                };
                const response = await fetch("https://api.brevo.com/v3/smtp/email", {
                    method: "POST",
                    headers: {
                        "api-key": BREVO_API_KEY,
                        "Content-Type": "application/json",
                        accept: "application/json",
                    },
                    body: JSON.stringify(body),
                });
                if (!response.ok) {
                    throw new Error(`Brevo email sending failed: ${response.status}`);
                }
                logger.info("Custom password reset email sent via Brevo", { email });
                return { success: true, message: "Password reset email sent successfully" };
            }
            else {
                throw new Error("No email provider configured");
            }
        }
    }
    catch (error) {
        logger.error("Custom password reset email error", {
            error: error instanceof Error ? error.message : 'Unknown error',
            email: req.data?.email,
            stack: error instanceof Error ? error.stack : undefined
        });
        // Re-throw HttpsError as-is
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        // Convert other errors to HttpsError
        throw new functions.https.HttpsError('internal', `Failed to send password reset email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
// --- Password Reset Update Function ---
exports.updateUserPasswordWithCode = (0, https_1.onCall)({
    region: "us-central1"
}, async (req) => {
    try {
        const { email, code, newPassword } = req.data || {};
        if (!email || !code || !newPassword) {
            throw new functions.https.HttpsError('invalid-argument', 'Email, code, and new password are required');
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid email format');
        }
        if (newPassword.length < 6) {
            throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters long');
        }
        // Ensure Firebase Admin is initialized
        if (!admin.apps || admin.apps.length === 0) {
            admin.initializeApp();
        }
        // Verify admin.firestore is available
        if (typeof admin.firestore !== 'function') {
            logger.error("admin.firestore is not a function. Admin apps:", admin.apps?.length || 0);
            throw new functions.https.HttpsError('internal', 'Firebase Admin SDK not properly initialized');
        }
        const db = admin.firestore();
        // Check if the reset code is valid
        const codeDoc = await db.collection('pending_password_resets').doc(email.toLowerCase()).get();
        if (!codeDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Invalid or expired reset code');
        }
        const codeData = codeDoc.data();
        if (Date.now() > (codeData?.expiresAt || 0)) {
            throw new functions.https.HttpsError('deadline-exceeded', 'Reset code has expired');
        }
        // Verify the code hash
        const crypto = require('crypto');
        const providedHash = crypto.createHash('sha256').update(code).digest('hex');
        if (providedHash !== codeData?.codeHash) {
            throw new functions.https.HttpsError('permission-denied', 'Invalid reset code');
        }
        // Get the user by email
        const userRecord = await admin.auth().getUserByEmail(email);
        if (!userRecord) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }
        // Update the user's password
        await admin.auth().updateUser(userRecord.uid, {
            password: newPassword
        });
        // Clean up the reset code
        await db.collection('pending_password_resets').doc(email.toLowerCase()).delete();
        logger.info("Password updated successfully for user:", email);
        return { success: true, message: "Password updated successfully" };
    }
    catch (error) {
        logger.error("Password update error:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', `Failed to update password: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
// --- Create Stripe Coupon ---
exports.createStripeCoupon = (0, https_1.onCall)({ region: "us-central1" }, async (req) => {
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
        return { couponId: coupon.id };
    }
    catch (error) {
        logger.error('Error creating Stripe coupon:', error);
        throw new Error('Failed to create Stripe coupon');
    }
});
// --- Create Stripe Promotion Code ---
exports.createStripePromotionCode = (0, https_1.onCall)({ region: "us-central1" }, async (req) => {
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
        return { promotionCodeId: promotionCode.id };
    }
    catch (error) {
        logger.error('Error creating Stripe promotion code:', error);
        throw new Error('Failed to create Stripe promotion code');
    }
});
// --- Get Stripe Coupons ---
exports.getStripeCoupons = (0, https_1.onCall)({ region: "us-central1" }, async (_req) => {
    const s = await ensureStripe();
    if (!s) {
        throw new Error("Stripe not configured");
    }
    try {
        const coupons = await s.coupons.list({ limit: 100 });
        return { coupons: coupons.data };
    }
    catch (error) {
        logger.error('Error fetching Stripe coupons:', error);
        throw new Error('Failed to fetch Stripe coupons');
    }
});
// --- Get Stripe Promotion Codes ---
exports.getStripePromotionCodes = (0, https_1.onCall)({ region: "us-central1" }, async (_req) => {
    const s = await ensureStripe();
    if (!s) {
        throw new Error("Stripe not configured");
    }
    try {
        const promotionCodes = await s.promotionCodes.list({ limit: 100 });
        return { promotionCodes: promotionCodes.data };
    }
    catch (error) {
        logger.error('Error fetching Stripe promotion codes:', error);
        throw new Error('Failed to fetch Stripe promotion codes');
    }
});
// Import shared pricing configuration
const DEFAULT_PLAN_FEATURES = {
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
function getDefaultFeaturesForPlan(planId) {
    return DEFAULT_PLAN_FEATURES[planId] || [];
}
// --- Get pricing configuration from Stripe ---
exports.getPricingConfig = (0, https_1.onCall)({
    region: "us-central1",
    secrets: ["STRIPE_SECRET_KEY", "PRICE_STARTER", "PRICE_STANDARD", "PRICE_PRO"]
}, async (_req) => {
    await initializeStripeSecrets();
    const s = await ensureStripe();
    if (!s) {
        // Return shared default configuration as fallback if Stripe is not configured
        return DEFAULT_PRICING_CONFIG;
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
        };
    }
    catch (error) {
        logger.error('Error fetching pricing config from Stripe:', error);
        throw new Error('Failed to fetch pricing configuration');
    }
});
// --- Seed test users (god/system-admin only) ---
exports.seedTestUsers = (0, https_1.onCall)({ region: "us-central1" }, async (req) => {
    if (!req.auth)
        throw new Error("unauthenticated");
    const uid = req.auth.uid;
    const db = admin.firestore();
    // Get user profile from userProfiles collection
    const prof = await db.doc(`userProfiles/${uid}`).get();
    const me = prof.exists ? prof.data() : {};
    const token = req.auth?.token || {};
    const isGod = String(me?.role || '').toLowerCase() === 'god';
    const isSystemAdmin = !!(me?.groups && me.groups['system-admin'] === true) || !!token.admin;
    if (!isGod && !isSystemAdmin)
        throw new Error("forbidden");
    const base = [
        { email: 'test_free@thepropslist.test', plan: 'free' },
        { email: 'test_starter@thepropslist.test', plan: 'starter' },
        { email: 'test_standard@thepropslist.test', plan: 'standard' },
        { email: 'test_pro@thepropslist.test', plan: 'pro' },
    ];
    const password = String(req.data?.password || 'PropsList-Test1!');
    const out = [];
    for (const { email, plan } of base) {
        let userRecord = null;
        try {
            const existing = await admin.auth().getUserByEmail(email);
            userRecord = existing;
        }
        catch {
            userRecord = await admin.auth().createUser({ email, password, emailVerified: true, displayName: email.split('@')[0] });
        }
        if (!userRecord)
            continue;
        const userId = userRecord.uid;
        await db.doc(`userProfiles/${userId}`).set({
            uid: userId,
            email,
            displayName: userRecord.displayName || email.split('@')[0],
            role: 'user',
            createdAt: Date.now(),
            lastLogin: null,
            groups: {},
            plan,
            subscriptionStatus: 'active',
            lastStripeEventTs: Date.now(),
            themePreference: 'light',
            notifications: true,
            defaultView: 'grid',
            organizations: [],
            onboardingCompleted: false
        }, { merge: true });
        out.push({ email, password, uid: userId, plan });
    }
    return { ok: true, users: out };
});
// --- Seed role-based test users (god/system-admin only) ---
exports.seedRoleBasedTestUsers = (0, https_1.onCall)({ region: "us-central1" }, async (req) => {
    if (!req.auth)
        throw new Error("unauthenticated");
    const uid = req.auth.uid;
    const db = admin.firestore();
    // Get user profile from userProfiles collection
    const prof = await db.doc(`userProfiles/${uid}`).get();
    const me = prof.exists ? prof.data() : {};
    const token = req.auth?.token || {};
    const isGod = String(me?.role || '').toLowerCase() === 'god';
    const isSystemAdmin = !!(me?.groups && me.groups['system-admin'] === true) || !!token.admin;
    if (!isGod && !isSystemAdmin)
        throw new Error("forbidden");
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
    const out = [];
    for (const userConfig of roleBasedUsers) {
        let userRecord = null;
        try {
            const existing = await admin.auth().getUserByEmail(userConfig.email);
            userRecord = existing;
        }
        catch {
            userRecord = await admin.auth().createUser({
                email: userConfig.email,
                password,
                emailVerified: true,
                displayName: userConfig.email.split('@')[0]
            });
        }
        if (!userRecord)
            continue;
        const userId = userRecord.uid;
        // Create user document in userProfiles collection
        await db.doc(`userProfiles/${userId}`).set({
            uid: userId,
            email: userConfig.email,
            displayName: userRecord.displayName || userConfig.email.split('@')[0],
            role: userConfig.role,
            createdAt: Date.now(),
            lastLogin: null,
            permissions: userConfig.permissions,
            groups: {},
            plan: 'free',
            subscriptionStatus: 'inactive',
            lastStripeEventTs: Date.now(),
            themePreference: 'light',
            notifications: true,
            defaultView: 'grid',
            organizations: [],
            onboardingCompleted: false
        }, { merge: true });
        out.push({
            email: userConfig.email,
            password,
            uid: userId,
            role: userConfig.role,
            permissions: userConfig.permissions
        });
    }
    return { ok: true, users: out };
});
// --- Admin: Subscription stats (god/system-admin only) ---
exports.getSubscriptionStats = (0, https_1.onCall)({ region: "us-central1" }, async (req) => {
    if (!req.auth)
        throw new Error("unauthenticated");
    const uid = req.auth.uid;
    const db = admin.firestore();
    const profileSnap = await db.doc(`userProfiles/${uid}`).get();
    const profile = profileSnap.exists ? profileSnap.data() : {};
    const isGod = profile?.role === "god";
    const isSystemAdmin = !!(profile?.groups && profile.groups["system-admin"] === true);
    if (!isGod && !isSystemAdmin)
        throw new Error("forbidden");
    const usersSnap = await db.collection("userProfiles").get();
    const byPlan = {};
    const byStatus = {};
    let total = 0;
    usersSnap.forEach((doc) => {
        const d = doc.data();
        total += 1;
        const plan = (d.plan || d.subscriptionPlan || "unknown").toString();
        const status = (d.subscriptionStatus || "unknown").toString();
        byPlan[plan] = (byPlan[plan] || 0) + 1;
        byStatus[status] = (byStatus[status] || 0) + 1;
    });
    return { total, byPlan, byStatus };
});
// --- Public container info for marketing site (/c/:id) ---
exports.publicContainerInfo = (0, https_1.onRequest)({ region: "us-central1", timeoutSeconds: 120, memory: "512MiB", minInstances: 1 }, async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    const idOrCode = (req.query.id || req.query.code || "").trim();
    if (!idOrCode) {
        res.status(400).json({ error: "missing id" });
        return;
    }
    try {
        const db = admin.firestore();
        // First: search within packLists.containers[] (legacy schema)
        const listsSnap = await db.collection("packLists").get();
        let found = null;
        listsSnap.forEach((doc) => {
            if (found)
                return;
            const data = doc.data();
            // Case 1: packList doc with containers array
            const containers = Array.isArray(data.containers) ? data.containers : [];
            const match = containers.find((c) => c && (c.id === idOrCode || c.code === idOrCode || c.name === idOrCode));
            if (match) {
                found = match;
                return;
            }
            // Case 2: some apps wrote container docs directly into packLists
            if (!found && data.name === idOrCode && Array.isArray(data.props)) {
                found = {
                    id: data.id || doc.id,
                    code: data.code || data.shortCode || undefined,
                    name: data.name,
                    status: data.status || data.containerStatus,
                    props: data.props,
                };
            }
        });
        // Second: search dedicated packingBoxes collection (current schema)
        let boxDoc = null;
        if (!found) {
            // Try direct doc lookup
            boxDoc = await db.collection("packingBoxes").doc(idOrCode).get();
            if (!boxDoc.exists) {
                // Try common fields
                const tryFields = ["code", "shortCode", "id", "name"];
                for (const field of tryFields) {
                    const qs = await db.collection("packingBoxes").where(field, "==", idOrCode).limit(1).get();
                    if (!qs.empty) {
                        boxDoc = qs.docs[0];
                        break;
                    }
                }
            }
            if (boxDoc && boxDoc.exists) {
                const d = boxDoc.data() || {};
                found = {
                    id: d.id || boxDoc.id,
                    code: d.code || d.shortCode || undefined,
                    name: d.name || boxDoc.id,
                    status: d.status || d.containerStatus,
                    props: Array.isArray(d.props) ? d.props : [],
                };
            }
        }
        if (!found) {
            res.status(404).json({ error: "not found" });
            return;
        }
        // Resolve prop names and first images if possible
        let propsOut = [];
        let publicProps = [];
        try {
            const propIds = Array.isArray(found.props) ? found.props.map((p) => p?.propId).filter(Boolean) : [];
            if (propIds.length) {
                const chunk = 10;
                const names = {};
                const firstImageUrl = {};
                for (let i = 0; i < propIds.length; i += chunk) {
                    const group = propIds.slice(i, i + chunk);
                    const qs = await db.collection("props").where(admin.firestore.FieldPath.documentId(), "in", group).get();
                    qs.forEach(d => {
                        const data = d.data();
                        names[d.id] = data?.name || "";
                        try {
                            const imgs = Array.isArray(data?.images) ? data.images : [];
                            const first = imgs.find((x) => x && (x.url || x.downloadURL || x.src));
                            firstImageUrl[d.id] = (first?.url || first?.downloadURL || first?.src || "");
                        }
                        catch { }
                    });
                }
                const limited = (found.props || []).slice(0, 50);
                propsOut = limited.map((p) => ({ name: names[p.propId] || p.name || "", quantity: p.quantity || 0 }));
                publicProps = limited.map((p) => ({ name: names[p.propId] || p.name || "", quantity: p.quantity || 0, imageUrl: firstImageUrl[p.propId] || "" }));
            }
        }
        catch { }
        // Load children (nested) if any
        let children = [];
        try {
            const childQs = await db.collection("packingBoxes").where("parentId", "==", found.id || idOrCode).limit(100).get();
            children = childQs.docs.map(d => {
                const cd = d.data();
                return { id: d.id, code: cd.code || cd.shortCode || null, name: cd.name || d.id };
            });
        }
        catch { }
        const publicData = {
            id: found.id || idOrCode,
            name: found.name || found.code || "Container",
            status: found.status || "unknown",
            propCount: Array.isArray(found.props) ? found.props.reduce((s, p) => s + (p.quantity || 0), 0) : 0,
            props: propsOut,
            publicProps,
            children,
        };
        res.json(publicData);
    }
    catch (err) {
        logger.error("publicContainerInfo error", { err });
        res.status(500).json({ error: "internal" });
    }
});
// Gen1 fallback for public container info to bypass Cloud Run startup issues
// Renamed to avoid version-downgrade conflicts if a V2 function with the same name ever existed
exports.publicContainerInfoLegacyV1 = functionsV1.https.onRequest(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    const idOrCode = (req.query?.id || req.query?.code || "").trim();
    if (!idOrCode) {
        res.status(400).json({ error: "missing id" });
        return;
    }
    try {
        const db = admin.firestore();
        // First: search within packLists.containers[] (legacy schema)
        const listsSnap = await db.collection("packLists").get();
        let found = null;
        listsSnap.forEach((doc) => {
            if (found)
                return;
            const data = doc.data();
            const containers = Array.isArray(data?.containers) ? data.containers : [];
            const match = containers.find((c) => c && (c.id === idOrCode || c.code === idOrCode || c.name === idOrCode));
            if (match) {
                found = match;
                return;
            }
            if (!found && data?.name === idOrCode && Array.isArray(data?.props)) {
                found = { id: data.id || doc.id, code: data.code || data.shortCode || undefined, name: data.name, status: data.status || data.containerStatus, props: data.props };
            }
        });
        // Second: search dedicated packingBoxes collection (current schema)
        let boxDoc = null;
        if (!found) {
            boxDoc = await db.collection("packingBoxes").doc(idOrCode).get();
            if (!boxDoc.exists) {
                const tryFields = ["code", "shortCode", "id", "name"];
                for (const field of tryFields) {
                    const qs = await db.collection("packingBoxes").where(field, "==", idOrCode).limit(1).get();
                    if (!qs.empty) {
                        boxDoc = qs.docs[0];
                        break;
                    }
                }
            }
            if (boxDoc && boxDoc.exists) {
                const d = boxDoc.data() || {};
                found = { id: d.id || boxDoc.id, code: d.code || d.shortCode || undefined, name: d.name || boxDoc.id, status: d.status || d.containerStatus, props: Array.isArray(d.props) ? d.props : [] };
            }
        }
        if (!found) {
            res.status(404).json({ error: "not found" });
            return;
        }
        // Resolve prop names and first images if possible
        let propsOut = [];
        let publicProps = [];
        try {
            const propIds = Array.isArray(found.props) ? found.props.map((p) => p?.propId).filter(Boolean) : [];
            if (propIds.length) {
                const chunk = 10;
                const names = {};
                const firstImageUrl = {};
                for (let i = 0; i < propIds.length; i += chunk) {
                    const group = propIds.slice(i, i + chunk);
                    const qs = await db.collection("props").where(admin.firestore.FieldPath.documentId(), "in", group).get();
                    qs.forEach(d => {
                        const data = d.data();
                        names[d.id] = data?.name || "";
                        try {
                            const imgs = Array.isArray(data?.images) ? data.images : [];
                            const first = imgs.find((x) => x && (x.url || x.downloadURL || x.src));
                            firstImageUrl[d.id] = (first?.url || first?.downloadURL || first?.src || "");
                        }
                        catch { }
                    });
                }
                const limited = (found.props || []).slice(0, 50);
                propsOut = limited.map((p) => ({ name: names[p.propId] || p.name || "", quantity: p.quantity || 0 }));
                publicProps = limited.map((p) => ({ name: names[p.propId] || p.name || "", quantity: p.quantity || 0, imageUrl: firstImageUrl[p.propId] || "" }));
            }
        }
        catch { }
        // Load children (nested) if any
        let children = [];
        try {
            const childQs = await db.collection("packingBoxes").where("parentId", "==", found.id || idOrCode).limit(100).get();
            children = childQs.docs.map(d => { const cd = d.data(); return { id: d.id, code: cd.code || cd.shortCode || null, name: cd.name || d.id }; });
        }
        catch { }
        const publicData = {
            id: found.id || idOrCode,
            name: found.name || found.code || "Container",
            status: found.status || "unknown",
            propCount: Array.isArray(found.props) ? found.props.reduce((s, p) => s + (p.quantity || 0), 0) : 0,
            props: propsOut,
            publicProps,
            children,
        };
        res.json(publicData);
    }
    catch (err) {
        logger.error("publicContainerInfoV1 error", { err });
        res.status(500).json({ error: "internal" });
    }
});
// --- Normalization utilities ---
exports.normalizeContainers = (0, https_1.onCall)({ region: "us-central1" }, async (req) => {
    const commit = !!req.data?.commit;
    const dryRun = [];
    const db = admin.firestore();
    // 1) Migrate inline containers in packLists into packingBoxes
    const lists = await db.collection("packLists").get();
    for (const doc of lists.docs) {
        const data = doc.data();
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
            if (!c || typeof c !== "object")
                continue;
            const boxId = c.id || c.code || c.name || undefined;
            if (!boxId)
                continue;
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
    return { ok: true, dryRun, committed: commit };
});
exports.setContainerParent = (0, https_1.onCall)({ region: "us-central1" }, async (req) => {
    const { boxId, parentId } = req.data || {};
    if (!boxId)
        throw new Error("boxId required");
    const db = admin.firestore();
    await db.collection("packingBoxes").doc(String(boxId)).set({ parentId: parentId || null }, { merge: true });
    return { ok: true };
});
// Convenience HTTP wrappers (guarded by token) to run admin tasks from CLI
exports.normalizeContainersHttp = (0, https_1.onRequest)({ region: "us-central1" }, async (req, res) => {
    try {
        const token = req.query.token || "";
        const commit = String(req.query.commit || "false").toLowerCase() === "true";
        const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_CONFIG && (() => { try {
            return JSON.parse(String(process.env.FIREBASE_CONFIG)).projectId;
        }
        catch {
            return "";
        } })() || "";
        if (!token || token !== projectId) {
            res.status(403).json({ ok: false, error: "forbidden" });
            return;
        }
        const db = admin.firestore();
        const out = [];
        const lists = await db.collection("packLists").get();
        for (const doc of lists.docs) {
            const data = doc.data();
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
                if (!c || typeof c !== "object")
                    continue;
                const boxId = c.id || c.code || c.name || undefined;
                if (!boxId)
                    continue;
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
    }
    catch (e) {
        logger.error("normalizeContainersHttp error", e);
        res.status(500).json({ ok: false });
    }
});
// Gen1 fallback endpoint for ease of invocation
exports.adminNormalizeContainers = functions.https.onRequest(async (req, res) => {
    try {
        const token = req.query.token || "";
        const commit = String(req.query.commit || "false").toLowerCase() === "true";
        const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_CONFIG && (() => { try {
            return JSON.parse(String(process.env.FIREBASE_CONFIG)).projectId;
        }
        catch {
            return "";
        } })() || "";
        if (!token || token !== projectId) {
            res.status(403).json({ ok: false, error: "forbidden" });
            return;
        }
        const db = admin.firestore();
        const out = [];
        const lists = await db.collection("packLists").get();
        for (const doc of lists.docs) {
            const data = doc.data();
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
                if (!c || typeof c !== "object")
                    continue;
                const boxId = c.id || c.code || c.name || undefined;
                if (!boxId)
                    continue;
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
    }
    catch (e) {
        logger.error("adminNormalizeContainers error", e);
        res.status(500).json({ ok: false });
    }
});
// --- Simple marketing waitlist collector ---
exports.joinWaitlist = (0, https_1.onRequest)({ region: "us-central1" }, async (req, res) => {
    // Minimal CORS (allow marketing site origins)
    const origin = req.headers.origin || "";
    const allowedOrigins = [
        "https://thepropslist-marketing.web.app",
        "https://thepropslist.uk",
        "https://www.thepropslist.uk",
    ];
    if (allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
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
        const body = (req.body || {});
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
            ip: req.headers["x-forwarded-for"] || null,
        };
        await admin.firestore().collection("waitlist").add(doc);
        res.status(200).json({ ok: true });
    }
    catch (err) {
        logger.error("joinWaitlist error", { err });
        res.status(500).json({ ok: false });
    }
});
// --- Image Optimization Functions ---
const sharp_1 = __importDefault(require("sharp"));
// Image optimization function
exports.optimizeImage = (0, https_1.onRequest)({
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
        let sharpInstance = (0, sharp_1.default)(imageBuffer);
        // Resize if dimensions provided
        if (width || height) {
            sharpInstance = sharpInstance.resize(width, height, {
                fit: 'inside',
                withoutEnlargement: true
            });
        }
        // Convert to requested format
        let outputBuffer;
        let contentType;
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
    }
    catch (error) {
        logger.error("Image optimization error", { error });
        res.status(500).json({
            error: "Image optimization failed",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
});
// Batch image optimization for existing images
exports.batchOptimizeImages = (0, https_1.onCall)({ region: "us-central1" }, async (req) => {
    if (!req.auth)
        throw new Error("unauthenticated");
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
                }
                catch (error) {
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
exports.purchaseAddOn = (0, https_1.onCall)({ region: "us-central1" }, async (req) => {
    try {
        if (!req.auth)
            throw new Error("unauthenticated");
        const s = await ensureStripe();
        if (!s)
            throw new Error("Stripe not configured");
        const { userId, addOnId, billingInterval } = req.data || {};
        if (!userId || !addOnId || !billingInterval) {
            throw new Error("Missing required parameters");
        }
        const db = admin.firestore();
        const profileRef = db.doc(`userProfiles/${userId}`);
        const profileSnap = await profileRef.get();
        const profile = profileSnap.exists ? profileSnap.data() : {};
        // Check if user has Standard or Pro plan
        const userPlan = profile.plan || profile.subscriptionPlan;
        if (!['standard', 'pro'].includes(userPlan)) {
            throw new Error("Add-ons are only available for Standard and Pro plans");
        }
        // Get user's Stripe customer ID
        let customerId = profile.stripeCustomerId;
        if (!customerId) {
            const user = await admin.auth().getUser(userId).catch(() => undefined);
            const email = (profile?.email || user?.email);
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
        const price = prices.data.find(p => p.recurring?.interval === billingInterval &&
            p.metadata?.addon_id === addOnId);
        if (!price) {
            throw new Error("Add-on price not found");
        }
        // Add the add-on to the subscription
        const _subscription = await s.subscriptions.retrieve(subscriptionId);
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
        };
    }
    catch (error) {
        reportError(error, 'purchaseAddOn', req.auth?.uid);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
});
// Cancel an add-on
exports.cancelAddOn = (0, https_1.onCall)({ region: "us-central1" }, async (req) => {
    try {
        if (!req.auth)
            throw new Error("unauthenticated");
        const s = await ensureStripe();
        if (!s)
            throw new Error("Stripe not configured");
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
        const userAddOn = userAddOnSnap.data();
        if (userAddOn.userId !== userId) {
            throw new Error("Unauthorized");
        }
        if (userAddOn.status !== 'active') {
            throw new Error("Add-on is not active");
        }
        // Cancel the subscription item in Stripe
        await s.subscriptionItems.update(userAddOn.stripeSubscriptionItemId, {
            metadata: {
                cancel_at_period_end: 'true'
            }
        });
        // Update the UserAddOn record
        await userAddOnRef.update({
            status: 'cancelled',
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true };
    }
    catch (error) {
        reportError(error, 'cancelAddOn', req.auth?.uid);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
});
// Get add-ons for marketing site
exports.getAddOnsForMarketing = (0, https_1.onRequest)({ region: "us-central1" }, async (req, res) => {
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
        const addOnProducts = products.data.filter(product => product.metadata?.addon_type &&
            product.metadata?.addon_id);
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
    }
    catch (error) {
        logger.error('Error fetching add-ons for marketing:', error);
        res.status(500).json({ error: 'Failed to fetch add-ons' });
    }
});
// Export the contact form function
var contact_js_1 = require("./contact.js");
Object.defineProperty(exports, "submitContactForm", { enumerable: true, get: function () { return contact_js_1.submitContactForm; } });
// Show deletion function with admin privileges - MINIMAL TEST VERSION
exports.deleteShowWithAdminPrivileges = (0, https_1.onCall)(async (req) => {
    try {
        // Verify user is authenticated
        if (!req.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { showId, confirmationToken } = req.data;
        // Validate input
        if (!showId || typeof showId !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'showId is required and must be a string');
        }
        if (!confirmationToken || typeof confirmationToken !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'confirmationToken is required for show deletion');
        }
        const userId = req.auth.uid;
        logger.info(`Starting show deletion for showId: ${showId}, userId: ${userId}`);
        // Get Firestore instance with admin privileges
        const db = admin.firestore();
        // Verify the show exists and user has permission
        const showRef = db.collection('shows').doc(showId);
        const showDoc = await showRef.get();
        if (!showDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Show not found');
        }
        const showData = showDoc.data();
        // Validate show data structure
        if (!showData || typeof showData !== 'object') {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid show document structure');
        }
        if (!showData.name || typeof showData.name !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'Show must have a valid name');
        }
        // Verify confirmation token (simple hash of showId + userId + timestamp)
        const expectedToken = Buffer.from(`${showId}:${userId}:${Math.floor(Date.now() / 1000 / 60)}`).toString('base64');
        if (confirmationToken !== expectedToken) {
            logger.warn(`User ${userId} provided invalid confirmation token for show ${showId}`);
            throw new functions.https.HttpsError('permission-denied', 'Invalid confirmation token');
        }
        // Check if user has permission to delete this show
        const hasPermission = showData?.userId === userId ||
            showData?.ownerId === userId ||
            showData?.createdBy === userId ||
            (showData?.team && showData.team[userId]);
        if (!hasPermission) {
            logger.warn(`User ${userId} attempted to delete show ${showId} without permission`);
            throw new functions.https.HttpsError('permission-denied', 'User does not have permission to delete this show');
        }
        logger.info(`User ${userId} has permission to delete show ${showId}`);
        // Create deletion log entry first (for audit trail)
        const deletionLogRef = db.collection('deletion_logs').doc();
        await deletionLogRef.set({
            showId,
            deletedBy: userId,
            deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            deletionMethod: 'admin_function',
            showName: showData.name,
            status: 'in_progress',
            confirmationToken: confirmationToken.substring(0, 10) + '...' // Log partial token for audit
        });
        // Simple batch deletion (will be enhanced after successful deployment)
        const batch = db.batch();
        let deletedCount = 0;
        // 1. Delete all props in the show (subcollection)
        const propsSnapshot = await db.collection('shows').doc(showId).collection('props').get();
        propsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
            deletedCount++;
        });
        logger.info(`Queued ${propsSnapshot.docs.length} props for deletion`);
        // 2. Delete all tasks related to the show
        const tasksSnapshot = await db.collection('tasks').where('showId', '==', showId).get();
        tasksSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
            deletedCount++;
        });
        logger.info(`Queued ${tasksSnapshot.docs.length} tasks for deletion`);
        // 3. Delete the show document itself
        batch.delete(showRef);
        deletedCount++;
        // Commit the batch deletion
        await batch.commit();
        // Update deletion log with success
        await deletionLogRef.update({
            status: 'completed',
            associatedDataCount: deletedCount - 1, // Exclude the show document itself
            completedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        logger.info(`Successfully deleted show ${showId} and ${deletedCount - 1} associated documents`);
        return {
            success: true,
            showId,
            deletedCount,
            associatedDataCount: deletedCount - 1,
            message: `Successfully deleted show "${showData.name}" and ${deletedCount - 1} associated items`
        };
    }
    catch (error) {
        logger.error('Error in deleteShowWithAdminPrivileges:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', `Failed to delete show: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
// ============================================================================
// DATABASE GARBAGE COLLECTION AND MAINTENANCE FUNCTIONS
// ============================================================================
/**
 * Scheduled function to clean up old emails from the emails collection
 * Runs daily at 2 AM UTC to clean up processed emails older than 30 days
 */
exports.cleanupOldEmails = (0, scheduler_1.onSchedule)({
    schedule: "0 2 * * *", // Daily at 2 AM UTC
    timeZone: "UTC",
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 540 // 9 minutes
}, async (event) => {
    const db = admin.firestore();
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    logger.info('Starting email cleanup process', { cutoffTime: new Date(thirtyDaysAgo).toISOString() });
    try {
        // Query for processed emails older than 30 days
        const oldEmailsQuery = db.collection('emails')
            .where('processed', '==', true)
            .where('processingAt', '<', admin.firestore.Timestamp.fromMillis(thirtyDaysAgo))
            .limit(500); // Process in batches
        const snapshot = await oldEmailsQuery.get();
        if (snapshot.empty) {
            logger.info('No old emails found to clean up');
            return;
        }
        logger.info(`Found ${snapshot.size} old emails to delete`);
        // Delete in batches to avoid hitting Firestore limits
        let deletedCount = 0;
        const batchSize = 450; // Leave buffer for safety (Firestore limit is 500)
        for (let i = 0; i < snapshot.docs.length; i += batchSize) {
            const batch = db.batch();
            const batchDocs = snapshot.docs.slice(i, i + batchSize);
            for (const doc of batchDocs) {
                batch.delete(doc.ref);
                deletedCount++;
            }
            await batch.commit();
            logger.info(`Deleted ${deletedCount} emails so far`);
        }
        logger.info(`Email cleanup completed. Deleted ${deletedCount} old emails`);
    }
    catch (error) {
        logger.error('Error during email cleanup:', error);
        throw error;
    }
});
/**
 * Scheduled function to clean up expired verification codes
 * Runs every 6 hours to clean up expired signup and password reset codes
 */
exports.cleanupExpiredCodes = (0, scheduler_1.onSchedule)({
    schedule: "0 */6 * * *", // Every 6 hours
    timeZone: "UTC",
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 300 // 5 minutes
}, async (event) => {
    const db = admin.firestore();
    const now = Date.now();
    logger.info('Starting expired codes cleanup process');
    try {
        // Clean up expired signup codes
        const expiredSignupCodes = await db.collection('pending_signups')
            .where('expiresAt', '<', now)
            .limit(500)
            .get();
        if (!expiredSignupCodes.empty) {
            const batchSize = 450;
            let deletedCount = 0;
            for (let i = 0; i < expiredSignupCodes.docs.length; i += batchSize) {
                const batch = db.batch();
                const batchDocs = expiredSignupCodes.docs.slice(i, i + batchSize);
                for (const doc of batchDocs) {
                    batch.delete(doc.ref);
                    deletedCount++;
                }
                await batch.commit();
            }
            logger.info(`Deleted ${deletedCount} expired signup codes`);
        }
        // Clean up expired password reset codes
        const expiredResetCodes = await db.collection('pending_password_resets')
            .where('expiresAt', '<', now)
            .limit(500)
            .get();
        if (!expiredResetCodes.empty) {
            const batchSize = 450;
            let deletedCount = 0;
            for (let i = 0; i < expiredResetCodes.docs.length; i += batchSize) {
                const batch = db.batch();
                const batchDocs = expiredResetCodes.docs.slice(i, i + batchSize);
                for (const doc of batchDocs) {
                    batch.delete(doc.ref);
                    deletedCount++;
                }
                await batch.commit();
            }
            logger.info(`Deleted ${deletedCount} expired password reset codes`);
        }
        logger.info('Expired codes cleanup completed');
    }
    catch (error) {
        logger.error('Error during expired codes cleanup:', error);
        throw error;
    }
});
/**
 * Scheduled function to clean up old failed emails
 * Runs weekly to clean up emails that failed to send and are older than 7 days
 */
exports.cleanupFailedEmails = (0, scheduler_1.onSchedule)({
    schedule: "0 3 * * 0", // Weekly on Sunday at 3 AM UTC
    timeZone: "UTC",
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 300 // 5 minutes
}, async (event) => {
    const db = admin.firestore();
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    logger.info('Starting failed emails cleanup process', { cutoffTime: new Date(sevenDaysAgo).toISOString() });
    try {
        // Query for failed emails older than 7 days
        const failedEmailsQuery = db.collection('emails')
            .where('delivery.state', '==', 'failed')
            .where('delivery.failedAt', '<', admin.firestore.Timestamp.fromMillis(sevenDaysAgo))
            .limit(500);
        const snapshot = await failedEmailsQuery.get();
        if (snapshot.empty) {
            logger.info('No old failed emails found to clean up');
            return;
        }
        logger.info(`Found ${snapshot.size} old failed emails to delete`);
        // Delete in batches
        let deletedCount = 0;
        const batchSize = 450; // Leave buffer for safety (Firestore limit is 500)
        for (let i = 0; i < snapshot.docs.length; i += batchSize) {
            const batch = db.batch();
            const batchDocs = snapshot.docs.slice(i, i + batchSize);
            for (const doc of batchDocs) {
                batch.delete(doc.ref);
                deletedCount++;
            }
            await batch.commit();
            logger.info(`Deleted ${deletedCount} failed emails so far`);
        }
        logger.info(`Failed emails cleanup completed. Deleted ${deletedCount} old failed emails`);
    }
    catch (error) {
        logger.error('Error during failed emails cleanup:', error);
        throw error;
    }
});
/**
 * Manual cleanup function for admin use
 * Allows admins to manually trigger cleanup of specific collections
 */
exports.manualCleanup = (0, https_1.onCall)({ region: "us-central1" }, async (req) => {
    if (!req.auth)
        throw new Error("unauthenticated");
    const uid = req.auth.uid;
    const db = admin.firestore();
    // Get user profile from userProfiles collection
    const prof = await db.doc(`userProfiles/${uid}`).get();
    const me = prof.exists ? prof.data() : {};
    const token = req.auth?.token || {};
    const isGod = String(me?.role || '').toLowerCase() === 'god';
    const isSystemAdmin = !!(me?.groups && me.groups['system-admin'] === true) || !!token.admin;
    if (!isGod && !isSystemAdmin)
        throw new Error("forbidden");
    const { collection, daysOld = 30, dryRun = true } = req.data || {};
    // Input validation
    if (!collection || typeof collection !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Collection name is required and must be a string');
    }
    if (typeof daysOld !== 'number' || daysOld < 1 || daysOld > 365) {
        throw new functions.https.HttpsError('invalid-argument', 'daysOld must be a number between 1 and 365');
    }
    if (typeof dryRun !== 'boolean') {
        throw new functions.https.HttpsError('invalid-argument', 'dryRun must be a boolean');
    }
    // Validate collection name to prevent arbitrary access
    const allowedCollections = ['emails', 'pending_signups', 'pending_password_resets', 'userProfiles'];
    if (!allowedCollections.includes(collection)) {
        throw new functions.https.HttpsError('invalid-argument', `Collection '${collection}' is not allowed for cleanup`);
    }
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    logger.info('Manual cleanup started', { collection, daysOld, dryRun, cutoffTime: new Date(cutoffTime).toISOString() });
    try {
        let query;
        // Build query based on collection type
        switch (collection) {
            case 'emails':
                query = db.collection(collection)
                    .where('processed', '==', true)
                    .where('processingAt', '<', admin.firestore.Timestamp.fromMillis(cutoffTime));
                break;
            case 'pending_signups':
            case 'pending_password_resets':
                query = db.collection(collection).where('expiresAt', '<', cutoffTime);
                break;
            default:
                // For other collections, try to find createdAt field
                query = db.collection(collection).where('createdAt', '<', admin.firestore.Timestamp.fromMillis(cutoffTime));
        }
        const snapshot = await query.limit(1000).get();
        if (snapshot.empty) {
            return {
                success: true,
                message: `No documents found in ${collection} older than ${daysOld} days`,
                deletedCount: 0,
                dryRun
            };
        }
        if (dryRun) {
            return {
                success: true,
                message: `Dry run: Would delete ${snapshot.size} documents from ${collection}`,
                wouldDeleteCount: snapshot.size,
                dryRun: true
            };
        }
        // Actually delete the documents
        let deletedCount = 0;
        const batchSize = 450; // Leave buffer for safety (Firestore limit is 500)
        // If deleting userProfiles, also clean up storage files
        if (collection === 'userProfiles' && !dryRun) {
            const bucket = admin.storage().bucket();
            const userIdsToDelete = snapshot.docs.map(doc => doc.id);
            logger.info(`Cleaning up storage files for ${userIdsToDelete.length} users`);
            for (const userId of userIdsToDelete) {
                // Clean up profile images (both casing variations)
                const profileImagePaths = [
                    `profile_images/${userId}`,
                    `profileImages/${userId}`
                ];
                for (const imagePath of profileImagePaths) {
                    try {
                        const file = bucket.file(imagePath);
                        const [exists] = await file.exists();
                        if (exists) {
                            await file.delete();
                            logger.info(`Deleted storage file: ${imagePath}`);
                        }
                    }
                    catch (error) {
                        logger.warn(`Could not delete ${imagePath}: ${error}`);
                    }
                }
                // Clean up any other user-specific storage files
                try {
                    const [files] = await bucket.getFiles({
                        prefix: `users/${userId}/`,
                        maxResults: 1000
                    });
                    for (const file of files) {
                        await file.delete();
                        logger.info(`Deleted user storage file: ${file.name}`);
                    }
                }
                catch (error) {
                    // This is expected if the prefix doesn't exist
                    logger.info(`No user-specific storage files found for ${userId}`);
                }
            }
        }
        for (let i = 0; i < snapshot.docs.length; i += batchSize) {
            const batch = db.batch();
            const batchDocs = snapshot.docs.slice(i, i + batchSize);
            for (const doc of batchDocs) {
                batch.delete(doc.ref);
                deletedCount++;
            }
            await batch.commit();
            logger.info(`Deleted ${deletedCount} documents so far`);
        }
        logger.info(`Manual cleanup completed. Deleted ${deletedCount} documents from ${collection}`);
        return {
            success: true,
            message: `Successfully deleted ${deletedCount} documents from ${collection}`,
            deletedCount,
            dryRun: false
        };
    }
    catch (error) {
        logger.error('Error during manual cleanup:', error);
        throw new functions.https.HttpsError('internal', `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
/**
 * Database health check function
 * Provides insights into database usage and cleanup opportunities
 */
exports.databaseHealthCheck = (0, https_1.onCall)({ region: "us-central1" }, async (req) => {
    if (!req.auth)
        throw new Error("unauthenticated");
    const uid = req.auth.uid;
    const db = admin.firestore();
    // Get user profile from userProfiles collection
    const prof = await db.doc(`userProfiles/${uid}`).get();
    const me = prof.exists ? prof.data() : {};
    const token = req.auth?.token || {};
    const isGod = String(me?.role || '').toLowerCase() === 'god';
    const isSystemAdmin = !!(me?.groups && me.groups['system-admin'] === true) || !!token.admin;
    if (!isGod && !isSystemAdmin)
        throw new Error("forbidden");
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    logger.info('Starting database health check');
    try {
        const healthReport = {
            timestamp: new Date().toISOString(),
            collections: {}
        };
        // Check emails collection
        const emailsTotal = await db.collection('emails').count().get();
        const emailsOld = await db.collection('emails')
            .where('processed', '==', true)
            .where('processingAt', '<', admin.firestore.Timestamp.fromMillis(thirtyDaysAgo))
            .count()
            .get();
        const emailsFailed = await db.collection('emails')
            .where('delivery.state', '==', 'failed')
            .where('delivery.failedAt', '<', admin.firestore.Timestamp.fromMillis(sevenDaysAgo))
            .count()
            .get();
        healthReport.collections.emails = {
            total: emailsTotal.data().count,
            oldProcessed: emailsOld.data().count,
            oldFailed: emailsFailed.data().count,
            cleanupOpportunity: emailsOld.data().count + emailsFailed.data().count
        };
        // Check pending signup codes
        const signupCodesTotal = await db.collection('pending_signups').count().get();
        const signupCodesExpired = await db.collection('pending_signups')
            .where('expiresAt', '<', now)
            .count()
            .get();
        healthReport.collections.pending_signups = {
            total: signupCodesTotal.data().count,
            expired: signupCodesExpired.data().count,
            cleanupOpportunity: signupCodesExpired.data().count
        };
        // Check pending password reset codes
        const resetCodesTotal = await db.collection('pending_password_resets').count().get();
        const resetCodesExpired = await db.collection('pending_password_resets')
            .where('expiresAt', '<', now)
            .count()
            .get();
        healthReport.collections.pending_password_resets = {
            total: resetCodesTotal.data().count,
            expired: resetCodesExpired.data().count,
            cleanupOpportunity: resetCodesExpired.data().count
        };
        // Calculate total cleanup opportunity
        const totalCleanupOpportunity = healthReport.collections.emails.cleanupOpportunity +
            healthReport.collections.pending_signups.cleanupOpportunity +
            healthReport.collections.pending_password_resets.cleanupOpportunity;
        healthReport.summary = {
            totalCleanupOpportunity,
            recommendations: []
        };
        // Add recommendations
        if (healthReport.collections.emails.oldProcessed > 0) {
            healthReport.summary.recommendations.push(`Consider running email cleanup to remove ${healthReport.collections.emails.oldProcessed} old processed emails`);
        }
        if (healthReport.collections.emails.oldFailed > 0) {
            healthReport.summary.recommendations.push(`Consider running failed email cleanup to remove ${healthReport.collections.emails.oldFailed} old failed emails`);
        }
        if (healthReport.collections.pending_signups.expired > 0) {
            healthReport.summary.recommendations.push(`Consider running expired codes cleanup to remove ${healthReport.collections.pending_signups.expired} expired signup codes`);
        }
        if (healthReport.collections.pending_password_resets.expired > 0) {
            healthReport.summary.recommendations.push(`Consider running expired codes cleanup to remove ${healthReport.collections.pending_password_resets.expired} expired password reset codes`);
        }
        if (totalCleanupOpportunity === 0) {
            healthReport.summary.recommendations.push('Database is clean - no cleanup needed');
        }
        logger.info('Database health check completed', healthReport);
        return {
            success: true,
            healthReport
        };
    }
    catch (error) {
        logger.error('Error during database health check:', error);
        throw new functions.https.HttpsError('internal', `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
/**
 * Orphaned Storage Cleanup Function
 *
 * This function finds and deletes orphaned files in Firebase Storage that are no longer
 * referenced by any Firestore documents. It also finds Firestore documents that reference
 * missing storage files.
 */
// Helper function to delete files in parallel with concurrency control
async function deleteFilesInParallel(files, concurrency = 10) {
    const results = { deleted: 0, failed: 0, errors: [] };
    // Process files in chunks to control concurrency
    for (let i = 0; i < files.length; i += concurrency) {
        const chunk = files.slice(i, i + concurrency);
        const promises = chunk.map(async (file) => {
            try {
                await deleteFileWithRetry(file);
                results.deleted++;
                logger.info(`Deleted orphaned file: ${file.name}`);
            }
            catch (error) {
                results.failed++;
                const errorMsg = `Failed to delete file ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                results.errors.push(errorMsg);
                logger.error(errorMsg);
            }
        });
        await Promise.all(promises);
        // Log progress for large operations
        if (files.length > 50) {
            logger.info(`Progress: ${Math.min(i + concurrency, files.length)}/${files.length} files processed`);
        }
    }
    return results;
}
// Helper function to delete a file with retry logic
async function deleteFileWithRetry(file, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await file.delete();
            return;
        }
        catch (error) {
            if (attempt === maxRetries) {
                throw error;
            }
            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, attempt) * 1000;
            logger.warn(`Delete attempt ${attempt} failed for ${file.name}, retrying in ${delay}ms:`, error);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
// Helper function to extract storage URLs from known fields only
function extractStorageUrls(data) {
    const urls = [];
    const knownStorageFields = [
        'photoURL', 'profileImage', 'imageUrl', 'image', 'avatar', 'thumbnail',
        'images', 'photos', 'attachments', 'media', 'files'
    ];
    const extractFromObject = (obj) => {
        if (typeof obj === 'string' && obj.includes('firebasestorage.googleapis.com')) {
            urls.push(obj);
        }
        else if (Array.isArray(obj)) {
            obj.forEach(item => extractFromObject(item));
        }
        else if (obj && typeof obj === 'object') {
            Object.entries(obj).forEach(([key, value]) => {
                // Only check known fields or if the key suggests it might contain URLs
                if (knownStorageFields.some(field => key.toLowerCase().includes(field.toLowerCase())) ||
                    typeof value === 'string' && value.includes('firebasestorage.googleapis.com')) {
                    extractFromObject(value);
                }
            });
        }
    };
    extractFromObject(data);
    return urls;
}
exports.cleanupOrphanedStorage = (0, https_1.onCall)({
    region: "us-central1",
    timeoutSeconds: 540, // 9 minutes for large operations
    memory: "512MiB" // More memory for parallel processing
}, async (req) => {
    if (!req.auth)
        throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    const db = admin.firestore();
    // Check if user has admin permissions
    const userProfile = await db.collection('userProfiles').doc(req.auth.uid).get();
    const userData = userProfile.exists ? userProfile.data() : {};
    const isGod = String(userData?.role || '').toLowerCase() === 'god';
    const isSystemAdmin = !!(userData?.groups && userData.groups['system-admin'] === true);
    if (!isGod && !isSystemAdmin) {
        throw new functions.https.HttpsError("permission-denied", "Admin access required");
    }
    // Input validation
    const { dryRun = true, maxFiles = 1000, concurrency = 10 } = req.data || {};
    if (typeof maxFiles !== 'number' || maxFiles < 1 || maxFiles > 10000) {
        throw new functions.https.HttpsError("invalid-argument", "maxFiles must be a number between 1 and 10000");
    }
    if (typeof concurrency !== 'number' || concurrency < 1 || concurrency > 50) {
        throw new functions.https.HttpsError("invalid-argument", "concurrency must be a number between 1 and 50");
    }
    logger.info('Orphaned storage cleanup started', { dryRun, maxFiles, concurrency });
    try {
        const bucket = admin.storage().bucket();
        const results = {
            orphanedFiles: [],
            missingReferences: [],
            deletedFiles: 0,
            failedDeletions: 0,
            totalFilesScanned: 0,
            deletionErrors: []
        };
        // Get all storage files
        const [files] = await bucket.getFiles({ maxResults: maxFiles });
        results.totalFilesScanned = files.length;
        logger.info(`Scanning ${files.length} storage files for orphaned references`);
        // Get all Firestore documents that might reference storage files
        // Only check collections that are likely to contain storage references
        const collections = ['userProfiles', 'shows', 'props', 'todo_boards', 'feedback'];
        const storageReferences = new Set();
        for (const collectionName of collections) {
            try {
                const snapshot = await db.collection(collectionName).get();
                logger.info(`Processing ${snapshot.size} documents from ${collectionName} collection`);
                for (const doc of snapshot.docs) {
                    const data = doc.data();
                    const urls = extractStorageUrls(data);
                    urls.forEach(url => storageReferences.add(url));
                }
            }
            catch (error) {
                logger.warn(`Error processing collection ${collectionName}:`, error);
                // Continue with other collections
            }
        }
        logger.info(`Found ${storageReferences.size} storage references in Firestore`);
        // Identify orphaned files
        const orphanedFiles = [];
        for (const file of files) {
            const fileUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media`;
            if (!storageReferences.has(fileUrl)) {
                results.orphanedFiles.push({
                    name: file.name,
                    size: file.metadata.size,
                    timeCreated: file.metadata.timeCreated,
                    url: fileUrl
                });
                orphanedFiles.push(file);
            }
        }
        logger.info(`Found ${orphanedFiles.length} orphaned files`);
        // Delete orphaned files if not in dry run mode
        if (!dryRun && orphanedFiles.length > 0) {
            logger.info(`Starting deletion of ${orphanedFiles.length} orphaned files with concurrency ${concurrency}`);
            const deletionResults = await deleteFilesInParallel(orphanedFiles, concurrency);
            results.deletedFiles = deletionResults.deleted;
            results.failedDeletions = deletionResults.failed;
            results.deletionErrors = deletionResults.errors;
        }
        // Check for missing references (Firestore docs that reference non-existent files)
        logger.info('Checking for missing storage references...');
        const missingRefs = [];
        // Process in batches to avoid overwhelming the storage API
        const urlArray = Array.from(storageReferences);
        const batchSize = 50;
        for (let i = 0; i < urlArray.length; i += batchSize) {
            const batch = urlArray.slice(i, i + batchSize);
            const batchPromises = batch.map(async (url) => {
                try {
                    const urlParts = url.split('/o/');
                    if (urlParts.length === 2) {
                        const filePath = decodeURIComponent(urlParts[1].split('?')[0]);
                        const file = bucket.file(filePath);
                        const [exists] = await file.exists();
                        if (!exists) {
                            missingRefs.push(url);
                        }
                    }
                }
                catch (error) {
                    logger.warn(`Error checking file existence for ${url}:`, error);
                }
            });
            await Promise.all(batchPromises);
            if (urlArray.length > 100) {
                logger.info(`Progress: ${Math.min(i + batchSize, urlArray.length)}/${urlArray.length} references checked`);
            }
        }
        results.missingReferences = missingRefs;
        const summary = {
            totalFilesScanned: results.totalFilesScanned,
            orphanedFilesFound: results.orphanedFiles.length,
            missingReferencesFound: results.missingReferences.length,
            filesDeleted: results.deletedFiles,
            failedDeletions: results.failedDeletions,
            dryRun,
            concurrency
        };
        logger.info('Orphaned storage cleanup completed', summary);
        return {
            success: true,
            summary,
            orphanedFiles: results.orphanedFiles,
            missingReferences: results.missingReferences,
            deletionErrors: results.deletionErrors
        };
    }
    catch (error) {
        logger.error('Error during orphaned storage cleanup:', error);
        throw new functions.https.HttpsError('internal', `Storage cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});

/**
 * Email Template Service
 * Builds email documents for queuing in Firestore
 * Shared between web and mobile apps for consistency
 */

import { APP_NAME, DEFAULT_FROM_EMAIL, DEFAULT_FROM_NAME, APP_URL, APP_DOMAIN } from '../shared/constants/app';

export interface EmailDocument {
  from: { email: string; name: string };
  to: Array<{ email: string; name: string }>;
  subject: string;
  html: string;
  text: string;
  replyTo: { email: string; name: string };
}

export interface VerificationEmailParams {
  toEmail: string;
  code: string;
}

export interface ReminderEmailParams {
  toEmail: string;
  showName: string;
  inviteUrl: string;
  inviteeName?: string | null;
  role: string;
}

/**
 * Build verification email document (for signup and password reset)
 */
export function buildVerificationEmailDoc(params: VerificationEmailParams): EmailDocument {
  const { toEmail, code } = params;
  
  const subject = `Your ${APP_NAME} verification code`;
  const html = `
    <div style="background:#ffffff;padding:32px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#000000;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #d1d5db;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.1);">
        <tr>
          <td style="padding:24px 32px;background:#ffffff;border-bottom:2px solid #3b82f6;">
            <div style="font-size:24px;font-weight:700;color:#1f2937;text-align:center;">${APP_NAME}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px 0;color:#000000;font-size:16px;line-height:1.5;">Here is your verification code:</p>
            <div style="margin:24px 0;padding:24px;background:#f9fafb;border:3px solid #3b82f6;border-radius:12px;text-align:center;">
              <p style="margin:0;font-size:36px;letter-spacing:8px;font-weight:900;color:#1f2937;font-family:monospace;">${code}</p>
            </div>
            <p style="margin:0 0 16px 0;color:#374151;font-size:15px;line-height:1.5;">The code expires in 10 minutes and can be used once.</p>
            <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.5;">If you didn't request this, you can ignore this email.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:13px;text-align:center;">
            <div>Sent by ${APP_NAME} • <a href="${APP_URL}" style="color:#3b82f6;text-decoration:none;">${APP_DOMAIN}</a></div>
          </td>
        </tr>
      </table>
    </div>
  `;
  const text = `Your ${APP_NAME} verification code: ${code}\nIt expires in 10 minutes.`;
  
  return {
    from: { email: DEFAULT_FROM_EMAIL, name: DEFAULT_FROM_NAME },
    to: [{ email: toEmail, name: 'User' }],
    subject,
    html,
    text,
    replyTo: { email: DEFAULT_FROM_EMAIL, name: DEFAULT_FROM_NAME },
  };
}

/**
 * Build reminder email document for team invitations
 */
export function buildReminderEmailDoc(params: ReminderEmailParams): EmailDocument {
  const { toEmail, showName, inviteUrl, inviteeName, role } = params;
  const name = inviteeName ? ` ${inviteeName}` : '';
  
  const html = `
    <div style="background:#ffffff;padding:32px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#000000;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #d1d5db;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.1);">
        <tr>
          <td style="padding:24px 32px;background:#ffffff;border-bottom:2px solid #3b82f6;">
            <div style="font-size:24px;font-weight:700;color:#1f2937;text-align:center;">${APP_NAME}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px 0;color:#000000;font-size:16px;line-height:1.5;">Hello${name},</p>
            <p style="margin:0 0 20px 0;color:#000000;font-size:16px;line-height:1.5;">This is a reminder that you've been invited as <strong>${role}</strong> on <strong>${showName}</strong>.</p>
            <p style="margin:0 0 24px 0;color:#000000;font-size:16px;line-height:1.5;">Click the button below to accept your invite.</p>
            <p style="margin:0 0 32px 0;text-align:center;">
              <a href="${inviteUrl}"
                 style="display:inline-block;background:#3b82f6;color:#ffffff;text-decoration:none;font-weight:700;padding:16px 32px;border-radius:8px;font-size:16px;">Accept Invite</a>
            </p>
            <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.5;">If the button doesn't work, copy and paste this link into your browser:<br/>
            <span style="word-break:break-all;color:#374151;font-family:monospace;">${inviteUrl}</span></p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:13px;text-align:center;">
            <div>Sent by ${APP_NAME} • <a href="${APP_URL}" style="color:#3b82f6;text-decoration:none;">${APP_DOMAIN}</a></div>
          </td>
        </tr>
      </table>
    </div>
  `;
  const text = `Hello${name},\n\nThis is a reminder that you've been invited as ${role} on ${showName}.\n\nAccept your invite: ${inviteUrl}\n\nIf the link doesn't work, copy and paste it into your browser.\n\n${APP_NAME} • ${APP_DOMAIN}`;
  
  return {
    from: { email: DEFAULT_FROM_EMAIL, name: DEFAULT_FROM_NAME },
    to: [{ email: toEmail, name: inviteeName || 'Invitee' }],
    subject: `Reminder: join ${showName} on ${APP_NAME}`,
    html,
    text,
    replyTo: { email: DEFAULT_FROM_EMAIL, name: DEFAULT_FROM_NAME },
  };
}


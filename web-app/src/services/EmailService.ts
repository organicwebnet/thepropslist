export type InviteEmailParams = {
  appName?: string;
  fromEmail?: string;
  fromName?: string;
  showName: string;
  inviteUrl: string;
  inviteeName?: string | null;
  role: string;
  jobRoleLabel?: string;
};

const DEFAULT_FROM_EMAIL = 'info@thepropslist.uk';
const DEFAULT_FROM_NAME = 'The Props List';
const DEFAULT_APP_NAME = 'The Props List';

function buildInviteHtml(params: InviteEmailParams): string {
  const name = params.inviteeName ? ` ${params.inviteeName}` : '';
  const roleLine = params.jobRoleLabel ? `${params.role} (${params.jobRoleLabel})` : params.role;
  return `
    <div style="background:#ffffff;padding:32px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#000000;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #d1d5db;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.1);">
        <tr>
          <td style="padding:24px 32px;background:#ffffff;border-bottom:2px solid #3b82f6;">
            <div style="font-size:24px;font-weight:700;color:#1f2937;text-align:center;">${params.appName || DEFAULT_APP_NAME}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px 0;color:#000000;font-size:16px;line-height:1.5;">Hello${name},</p>
            <p style="margin:0 0 20px 0;color:#000000;font-size:16px;line-height:1.5;">You've been invited as <strong>${roleLine}</strong> on <strong>${params.showName}</strong>.</p>
            <p style="margin:0 0 24px 0;color:#000000;font-size:16px;line-height:1.5;">Click the button below to accept your invite.</p>
            <p style="margin:0 0 32px 0;text-align:center;">
              <a href="${params.inviteUrl}"
                 style="display:inline-block;background:#3b82f6;color:#ffffff;text-decoration:none;font-weight:700;padding:16px 32px;border-radius:8px;font-size:16px;">Accept Invite</a>
            </p>
            <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.5;">If the button doesn't work, copy and paste this link into your browser:<br/>
            <span style="word-break:break-all;color:#374151;font-family:monospace;">${params.inviteUrl}</span></p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:13px;text-align:center;">
            <div>Sent by ${params.appName || DEFAULT_APP_NAME} • <a href="https://thepropslist.uk" style="color:#3b82f6;text-decoration:none;">thepropslist.uk</a></div>
          </td>
        </tr>
      </table>
    </div>
  `;
}

function buildInviteText(params: InviteEmailParams): string {
  const name = params.inviteeName ? ` ${params.inviteeName}` : '';
  const roleLine = params.jobRoleLabel ? `${params.role} (${params.jobRoleLabel})` : params.role;
  return `Hello${name},\n\nYou’ve been invited as ${roleLine} on ${params.showName}.\n\nAccept your invite: ${params.inviteUrl}\n\nIf the link doesn’t work, copy and paste it into your browser.\n\n${params.appName || DEFAULT_APP_NAME} • thepropslist.uk`;
}

export function buildInviteEmailDoc(params: InviteEmailParams) {
  return {
    from: { email: params.fromEmail || DEFAULT_FROM_EMAIL, name: params.fromName || DEFAULT_FROM_NAME },
    to: [{ email: params.inviteeName ? undefined : undefined }],
    subject: `You’re invited to join ${params.showName} on ${params.appName || DEFAULT_APP_NAME}`,
    html: buildInviteHtml(params),
    text: buildInviteText(params),
    replyTo: { email: params.fromEmail || DEFAULT_FROM_EMAIL, name: params.fromName || DEFAULT_FROM_NAME },
  } as any;
}

export function buildInviteEmailDocTo(toEmail: string, params: InviteEmailParams) {
  const base = buildInviteEmailDoc(params);
  return {
    ...base,
    to: [{ email: toEmail, name: params.inviteeName || 'Invitee' }],
  };
}

export function buildReminderEmailDoc(toEmail: string, params: InviteEmailParams) {
  const base = buildInviteEmailDoc(params);
  return {
    ...base,
    subject: `Reminder: join ${params.showName} on ${params.appName || DEFAULT_APP_NAME}`,
    to: [{ email: toEmail, name: params.inviteeName || 'Invitee' }],
  };
}


// Email verification (code-based) helpers
export function buildVerificationEmailDoc(toEmail: string, code: string) {
  const subject = `Your ${DEFAULT_APP_NAME} verification code`;
  const html = `
    <div style="background:#ffffff;padding:32px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#000000;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #d1d5db;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.1);">
        <tr>
          <td style="padding:24px 32px;background:#ffffff;border-bottom:2px solid #3b82f6;">
            <div style="font-size:24px;font-weight:700;color:#1f2937;text-align:center;">${DEFAULT_APP_NAME}</div>
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
            <div>Sent by ${DEFAULT_APP_NAME} • <a href="https://thepropslist.uk" style="color:#3b82f6;text-decoration:none;">thepropslist.uk</a></div>
          </td>
        </tr>
      </table>
    </div>
  `;
  const text = `Your ${DEFAULT_APP_NAME} verification code: ${code}\nIt expires in 10 minutes.`;
  return {
    from: { email: DEFAULT_FROM_EMAIL, name: DEFAULT_FROM_NAME },
    to: [{ email: toEmail, name: 'User' }],
    subject,
    html,
    text,
    replyTo: { email: DEFAULT_FROM_EMAIL, name: DEFAULT_FROM_NAME },
  } as any;
}

// Password reset email helper
export function buildPasswordResetEmailDoc(toEmail: string, resetUrl: string) {
  const subject = `Reset your ${DEFAULT_APP_NAME} password`;
  const html = `
    <div style="background:#ffffff;padding:32px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#000000;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #d1d5db;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.1);">
        <tr>
          <td style="padding:24px 32px;background:#ffffff;border-bottom:2px solid #3b82f6;">
            <div style="font-size:24px;font-weight:700;color:#1f2937;text-align:center;">${DEFAULT_APP_NAME}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px 0;color:#000000;font-size:16px;line-height:1.5;">We received a request to reset your password.</p>
            <p style="margin:0 0 24px 0;color:#000000;font-size:16px;line-height:1.5;">Click the button below to reset your password:</p>
            <p style="margin:0 0 32px 0;text-align:center;">
              <a href="${resetUrl}"
                 style="display:inline-block;background:#3b82f6;color:#ffffff;text-decoration:none;font-weight:700;padding:16px 32px;border-radius:8px;font-size:16px;">Reset Password</a>
            </p>
            <p style="margin:0 0 16px 0;color:#374151;font-size:15px;line-height:1.5;">This link will expire in 24 hours for security reasons.</p>
            <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.5;">If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:13px;text-align:center;">
            <div>Sent by ${DEFAULT_APP_NAME} • <a href="https://thepropslist.uk" style="color:#3b82f6;text-decoration:none;">thepropslist.uk</a></div>
          </td>
        </tr>
      </table>
    </div>
  `;
  const text = `Reset your ${DEFAULT_APP_NAME} password\n\nClick this link to reset your password: ${resetUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't request this, you can ignore this email.`;
  return {
    from: { email: DEFAULT_FROM_EMAIL, name: DEFAULT_FROM_NAME },
    to: [{ email: toEmail, name: 'User' }],
    subject,
    html,
    text,
    replyTo: { email: DEFAULT_FROM_EMAIL, name: DEFAULT_FROM_NAME },
  } as any;
}


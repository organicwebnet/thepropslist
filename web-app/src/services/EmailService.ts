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
    <div style="background:#0b0b12;padding:24px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#e5e7eb;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:#111827;border-radius:10px;border:1px solid #1f2937;overflow:hidden;">
        <tr>
          <td style="padding:20px 24px;background:#0f172a;border-bottom:1px solid #1f2937;">
            <div style="font-size:18px;font-weight:700;color:#ffffff;">${params.appName || DEFAULT_APP_NAME}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px;">
            <p style="margin:0 0 12px 0;">Hello${name},</p>
            <p style="margin:0 0 16px 0;">You’ve been invited as <strong>${roleLine}</strong> on <strong>${params.showName}</strong>.</p>
            <p style="margin:0 0 24px 0;">Click the button below to accept your invite.</p>
            <p style="margin:0 0 24px 0;">
              <a href="${params.inviteUrl}"
                 style="display:inline-block;background:#06b6d4;color:#0b0b12;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px;">Accept invite</a>
            </p>
            <p style="margin:0;color:#9ca3af;font-size:13px;">If the button doesn’t work, copy and paste this link into your browser:<br/>
            <span style="word-break:break-all;color:#cbd5e1;">${params.inviteUrl}</span></p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px;background:#0f172a;border-top:1px solid #1f2937;color:#94a3b8;font-size:12px;">
            <div>Sent by ${params.appName || DEFAULT_APP_NAME} • thepropslist.uk</div>
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



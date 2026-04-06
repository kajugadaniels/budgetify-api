import { buildBaseEmailTemplate } from './base-email.template';

interface EmailPayload {
  subject: string;
  html: string;
}

/**
 * Builds the invitation email sent to a user who has been invited to share
 * finances with an existing Budgetify user.
 */
export function buildPartnershipInviteEmail(
  inviteeEmail: string,
  ownerName: string | null,
  acceptUrl: string,
): EmailPayload {
  const senderLabel = ownerName ?? 'Someone';

  return {
    subject: `${senderLabel} invited you to manage finances together on Budgetify`,
    html: buildBaseEmailTemplate({
      title: "You're invited to Budgetify",
      previewText: `${senderLabel} invited you to share finances on Budgetify.`,
      bodyHtml: `
        <p style="margin:0 0 8px;color:#f5f1e8;font-size:28px;font-weight:700;letter-spacing:-0.04em;">You're invited</p>
        <p style="margin:0 0 20px;color:#9ea6b2;font-size:14px;line-height:1.7;">
          <span style="color:#f5f1e8;">${senderLabel}</span> wants to manage finances with you on Budgetify.
        </p>

        <div style="margin:0 0 20px;border:1px solid #262c36;border-radius:20px;background:#0f1318;padding:18px 18px 16px;">
          <p style="margin:0 0 10px;color:#7e8795;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">What you will share</p>
          <p style="margin:0;color:#c8ced8;font-size:13px;line-height:1.8;">
            Income, expenses, todos, savings, and loans.<br />
            Every record will still show who added it.
          </p>
        </div>

        <div style="margin:0 0 20px;text-align:left;">
          <a href="${acceptUrl}" style="display:inline-block;border-radius:999px;background:#d3ccb8;padding:13px 22px;color:#0b0d10;font-size:14px;font-weight:700;text-decoration:none;">
            Accept invitation
          </a>
        </div>

        <p style="margin:0 0 10px;color:#c8ced8;font-size:13px;line-height:1.7;">
          Sign in with <span style="color:#f5f1e8;">${inviteeEmail}</span> to accept it.
        </p>
        <p style="margin:0;color:#7e8795;font-size:13px;line-height:1.7;">
          This invitation expires in 7 days. If you were not expecting it, just ignore this email.
        </p>
      `,
    }),
  };
}

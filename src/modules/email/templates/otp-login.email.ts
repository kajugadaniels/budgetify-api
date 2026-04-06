import { buildBaseEmailTemplate } from './base-email.template';

interface EmailPayload {
  subject: string;
  html: string;
}

/**
 * Builds the transactional email sent to an existing user when they request
 * a login OTP. The OTP must never appear in a subject line that could be
 * previewed by mail clients — only inside the HTML body.
 */
export function buildOtpLoginEmail(
  otp: string,
  firstName: string | null,
): EmailPayload {
  const greeting = firstName ? `Hi ${firstName}` : 'Welcome back';

  return {
    subject: `Your Budgetify sign-in code`,
    html: buildBaseEmailTemplate({
      title: 'Sign in to Budgetify',
      previewText: `Use ${otp} to sign in to Budgetify.`,
      bodyHtml: `
        <p style="margin:0 0 8px;color:#f5f1e8;font-size:28px;font-weight:700;letter-spacing:-0.04em;">${greeting}</p>
        <p style="margin:0 0 24px;color:#9ea6b2;font-size:14px;line-height:1.7;">
          Use this code to sign in. It works once and expires in 10 minutes.
        </p>

        <div style="margin:0 0 22px;border:1px solid #262c36;border-radius:20px;background:#0f1318;padding:22px 18px;text-align:center;">
          <p style="margin:0 0 8px;color:#7e8795;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">Sign-in code</p>
          <p style="margin:0;color:#d7cfba;font-size:44px;font-weight:700;letter-spacing:0.28em;font-variant-numeric:tabular-nums;">${otp}</p>
        </div>

        <p style="margin:0 0 12px;color:#c8ced8;font-size:13px;line-height:1.7;">
          Do not share this code with anyone.
        </p>
        <p style="margin:0;color:#7e8795;font-size:13px;line-height:1.7;">
          If this was not you, just ignore this email.
        </p>
      `,
    }),
  };
}

import { buildBaseEmailTemplate } from './base-email.template';

export function buildPasswordOtpEmail(
  otp: string,
  firstName: string | null,
  isRecovery: boolean,
): {
  subject: string;

  html: string;
} {
  const greeting = firstName?.trim()
    ? `Hi ${escapeHtml(firstName.trim())}`
    : 'Hi there';

  const action = isRecovery ? 'reset your password' : 'create your password';

  return {
    subject: isRecovery
      ? 'Reset your Budgetify password'
      : 'Create your Budgetify password',

    html: buildBaseEmailTemplate({
      title: isRecovery ? 'Reset your password' : 'Create your password',

      previewText: 'Your 4-digit Budgetify verification code is inside.',

      bodyHtml: `
          <p style="margin:0 0 8px;color:#f5f1e8;font-size:28px;font-weight:700;letter-spacing:-0.04em;">
            ${greeting}
          </p>

          <p style="margin:0 0 24px;color:#9ea6b2;font-size:14px;line-height:1.7;">
            Use this 4-digit code to ${action}. It works once and expires in 10 minutes.
          </p>

          <div style="margin:0 0 22px;border:1px solid #262c36;border-radius:20px;background:#0f1318;padding:22px 18px;text-align:center;">
            <p style="margin:0 0 8px;color:#7e8795;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">
              Verification code
            </p>

            <p style="margin:0;color:#d7cfba;font-size:48px;font-weight:700;letter-spacing:0.38em;font-variant-numeric:tabular-nums;">
              ${otp}
            </p>
          </div>

          <p style="margin:0 0 12px;color:#c8ced8;font-size:13px;line-height:1.7;">
            Do not share this code with anyone.
          </p>

          <p style="margin:0;color:#7e8795;font-size:13px;line-height:1.7;">
            If you did not request this change, ignore this email. Your password will remain unchanged.
          </p>
        `,
    }),
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

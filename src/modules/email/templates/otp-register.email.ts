import { buildBaseEmailTemplate } from './base-email.template';

interface EmailPayload {
  subject: string;
  html: string;
}

/**
 * Builds the onboarding email sent to a new user when they register with their
 * email address. Includes the verification OTP and a short intro to Budgetify.
 */
export function buildOtpRegisterEmail(
  otp: string,
  email: string,
): EmailPayload {
  return {
    subject: `Welcome to Budgetify — verify your email`,
    html: buildBaseEmailTemplate({
      title: 'Welcome to Budgetify',
      previewText: `Use ${otp} to verify ${email}.`,
      bodyHtml: `
        <p style="margin:0 0 8px;color:#f5f1e8;font-size:28px;font-weight:700;letter-spacing:-0.04em;">Verify your email</p>
        <p style="margin:0 0 24px;color:#9ea6b2;font-size:14px;line-height:1.7;">
          Enter this code in Budgetify to verify <span style="color:#f5f1e8;">${email}</span>. It expires in 10 minutes.
        </p>

        <div style="margin:0 0 22px;border:1px solid #262c36;border-radius:20px;background:#0f1318;padding:22px 18px;text-align:center;">
          <p style="margin:0 0 8px;color:#7e8795;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">Verification code</p>
          <p style="margin:0;color:#d7cfba;font-size:44px;font-weight:700;letter-spacing:0.28em;font-variant-numeric:tabular-nums;">${otp}</p>
        </div>

        <p style="margin:0 0 12px;color:#c8ced8;font-size:13px;line-height:1.7;">
          Do not share this code with anyone.
        </p>
        <p style="margin:0;color:#7e8795;font-size:13px;line-height:1.7;">
          If you did not create this account, just ignore this email.
        </p>
      `,
    }),
  };
}

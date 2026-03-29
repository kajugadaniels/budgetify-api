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
  const year = new Date().getFullYear();

  return {
    subject: `Your Budgetify sign-in code`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign in to Budgetify</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#0B0D10;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0B0D10;padding:48px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;">

          <!-- Brand header -->
          <tr>
            <td style="background:linear-gradient(135deg,#171C22 0%,#12161B 100%);border-radius:20px 20px 0 0;border:1px solid #2A313A;border-bottom:none;padding:32px 40px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display:inline-block;background:rgba(199,191,167,0.12);border-radius:10px;padding:8px 14px;">
                      <span style="font-size:16px;font-weight:700;color:#C7BFA7;letter-spacing:-0.3px;">Budgetify</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#12161B;border-left:1px solid #2A313A;border-right:1px solid #2A313A;padding:36px 40px 32px;">

              <p style="margin:0 0 6px;font-size:26px;font-weight:700;color:#F4F1EA;letter-spacing:-0.6px;">${greeting} 👋</p>
              <p style="margin:0 0 32px;font-size:15px;color:#AEA792;line-height:1.65;">
                Here is your one-time sign-in code for Budgetify.
                It is valid for <strong style="color:#F4F1EA;">10 minutes</strong> and can only be used once.
              </p>

              <!-- OTP display -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background-color:#1E242C;border:1px solid #2A313A;border-radius:16px;padding:28px 24px;text-align:center;">
                    <p style="margin:0 0 10px;font-size:11px;font-weight:600;color:#AEA792;letter-spacing:2px;text-transform:uppercase;">Your sign-in code</p>
                    <p style="margin:0;font-size:52px;font-weight:700;color:#C7BFA7;letter-spacing:14px;font-variant-numeric:tabular-nums;">${otp}</p>
                  </td>
                </tr>
              </table>

              <!-- Security notice -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#1a1f26;border-left:3px solid #C7BFA7;border-radius:0 8px 8px 0;padding:14px 18px;">
                    <p style="margin:0;font-size:13px;color:#AEA792;line-height:1.6;">
                      <strong style="color:#F4F1EA;">Security notice:</strong>
                      Budgetify will never ask for this code via phone, chat, or another email.
                      Do not share it with anyone.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#6B7280;line-height:1.6;">
                Didn't request this? You can safely ignore this email — your account remains secure
                and no action is required.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#0F1318;border-radius:0 0 20px 20px;border:1px solid #2A313A;border-top:none;padding:22px 40px;">
              <p style="margin:0;font-size:12px;color:#4B5563;text-align:center;line-height:1.6;">
                © ${year} Budgetify · Built with care for your financial future.<br />
                This is an automated email — please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  };
}

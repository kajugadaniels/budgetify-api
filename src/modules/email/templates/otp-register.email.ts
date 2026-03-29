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
  const year = new Date().getFullYear();

  return {
    subject: `Welcome to Budgetify — verify your email`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Budgetify</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#0B0D10;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0B0D10;padding:48px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;">

          <!-- Brand header with accent gradient -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1f26 0%,#12161B 60%,#171007 100%);border-radius:20px 20px 0 0;border:1px solid #2A313A;border-bottom:none;padding:36px 40px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display:inline-block;background:rgba(199,191,167,0.12);border-radius:10px;padding:8px 14px;margin-bottom:20px;">
                      <span style="font-size:16px;font-weight:700;color:#C7BFA7;letter-spacing:-0.3px;">Budgetify</span>
                    </div>
                    <p style="margin:0 0 6px;font-size:28px;font-weight:700;color:#F4F1EA;letter-spacing:-0.7px;">You're almost in ✨</p>
                    <p style="margin:0;font-size:15px;color:#AEA792;line-height:1.55;">
                      One last step — verify your email to activate your account.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#12161B;border-left:1px solid #2A313A;border-right:1px solid #2A313A;padding:36px 40px 32px;">

              <p style="margin:0 0 28px;font-size:15px;color:#AEA792;line-height:1.65;">
                Enter the code below in the Budgetify app to verify
                <strong style="color:#F4F1EA;">${email}</strong> and complete your account setup.
              </p>

              <!-- OTP display -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#1E242C 0%,#171C22 100%);border:1px solid rgba(199,191,167,0.20);border-radius:16px;padding:28px 24px;text-align:center;">
                    <p style="margin:0 0 10px;font-size:11px;font-weight:600;color:#AEA792;letter-spacing:2px;text-transform:uppercase;">Verification code</p>
                    <p style="margin:0 0 10px;font-size:52px;font-weight:700;color:#C7BFA7;letter-spacing:14px;font-variant-numeric:tabular-nums;">${otp}</p>
                    <p style="margin:0;font-size:12px;color:#6B7280;">Expires in 10 minutes</p>
                  </td>
                </tr>
              </table>

              <!-- What you get section -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:#1E242C;border-radius:12px;padding:20px 24px;">
                    <p style="margin:0 0 14px;font-size:13px;font-weight:600;color:#F4F1EA;">What you get with Budgetify:</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:4px 0;">
                          <span style="font-size:13px;color:#AEA792;line-height:1.6;">
                            📊 &nbsp;Unified view of all your income sources
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;">
                          <span style="font-size:13px;color:#AEA792;line-height:1.6;">
                            📉 &nbsp;Expense tracking across every category
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;">
                          <span style="font-size:13px;color:#AEA792;line-height:1.6;">
                            🎯 &nbsp;Savings goals with smart progress tracking
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Security notice -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#1a1f26;border-left:3px solid #C7BFA7;border-radius:0 8px 8px 0;padding:14px 18px;">
                    <p style="margin:0;font-size:13px;color:#AEA792;line-height:1.6;">
                      <strong style="color:#F4F1EA;">Security notice:</strong>
                      Never share this code with anyone.
                      If you did not create a Budgetify account, please ignore this email.
                    </p>
                  </td>
                </tr>
              </table>

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

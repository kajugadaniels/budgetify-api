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
  const year = new Date().getFullYear();

  return {
    subject: `${senderLabel} invited you to manage finances together on Budgetify`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're invited to Budgetify</title>
</head>
<body style="margin:0;padding:0;background-color:#0B0D10;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0B0D10;padding:48px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;">

          <!-- Brand header -->
          <tr>
            <td style="background:linear-gradient(135deg,#171C22 0%,#12161B 100%);border-radius:20px 20px 0 0;border:1px solid #2A313A;border-bottom:none;padding:32px 40px 28px;">
              <div style="display:inline-block;background:rgba(199,191,167,0.12);border-radius:10px;padding:8px 14px;">
                <span style="font-size:16px;font-weight:700;color:#C7BFA7;letter-spacing:-0.3px;">Budgetify</span>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#12161B;border-left:1px solid #2A313A;border-right:1px solid #2A313A;padding:36px 40px 32px;">

              <!-- Partner icons -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <div style="display:inline-flex;align-items:center;gap:0;">
                      <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,rgba(199,191,167,0.22),rgba(199,191,167,0.08));border:2px solid #C7BFA7;display:flex;align-items:center;justify-content:center;font-size:22px;line-height:56px;text-align:center;">💛</div>
                      <div style="width:32px;height:2px;background:linear-gradient(90deg,#C7BFA7,rgba(199,191,167,0.3));margin:0 -4px;position:relative;z-index:1;"></div>
                      <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,rgba(199,191,167,0.08),rgba(199,191,167,0.22));border:2px solid rgba(199,191,167,0.45);display:flex;align-items:center;justify-content:center;font-size:22px;line-height:56px;text-align:center;">🌟</div>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px;font-size:24px;font-weight:700;color:#F4F1EA;letter-spacing:-0.6px;text-align:center;">
                You've been invited, partner! 🎉
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#AEA792;line-height:1.7;text-align:center;">
                <strong style="color:#C7BFA7;">${senderLabel}</strong> wants to share their finances with you
                on Budgetify — plan together, track together, and grow together.
              </p>

              <!-- What's shared box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:#1E242C;border:1px solid #2A313A;border-radius:14px;padding:22px 24px;">
                    <p style="margin:0 0 14px;font-size:11px;font-weight:600;color:#AEA792;letter-spacing:2px;text-transform:uppercase;">What you'll share</p>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr><td style="padding:4px 0;font-size:14px;color:#F4F1EA;">📊 &nbsp;Income &amp; expenses</td></tr>
                      <tr><td style="padding:4px 0;font-size:14px;color:#F4F1EA;">✅ &nbsp;Todos &amp; budget plans</td></tr>
                      <tr><td style="padding:4px 0;font-size:14px;color:#F4F1EA;">🏦 &nbsp;Savings &amp; loans</td></tr>
                      <tr><td style="padding:4px 0;font-size:14px;color:#F4F1EA;">👤 &nbsp;Each entry shows who added it</td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${acceptUrl}" style="display:inline-block;background:linear-gradient(135deg,#C7BFA7,#B0A88E);color:#0B0D10;font-size:15px;font-weight:700;text-decoration:none;padding:15px 36px;border-radius:50px;letter-spacing:-0.2px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <!-- How it works -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#1a1f26;border-left:3px solid #C7BFA7;border-radius:0 8px 8px 0;padding:14px 18px;">
                    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#F4F1EA;">How to accept:</p>
                    <p style="margin:0;font-size:13px;color:#AEA792;line-height:1.7;">
                      1. Click <strong style="color:#C7BFA7;">Accept Invitation</strong> above.<br />
                      2. Sign in to Budgetify (or create an account for <strong style="color:#C7BFA7;">${inviteeEmail}</strong>).<br />
                      3. Review the partnership details and confirm.<br />
                      4. Done — your finances are now shared! 🎊
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;color:#6B7280;line-height:1.6;text-align:center;">
                This invitation expires in <strong style="color:#AEA792;">7 days</strong>.
                If you didn't expect this, you can safely ignore it.
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

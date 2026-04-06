interface BaseEmailTemplateParams {
  bodyHtml: string;
  previewText: string;
  title: string;
}

export function buildBaseEmailTemplate({
  bodyHtml,
  previewText,
  title,
}: BaseEmailTemplateParams): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet" />
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#0b0d10;font-family:'DM Sans',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${previewText}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b0d10;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <tr>
            <td style="padding:0 0 14px 4px;">
              <span style="display:inline-block;border:1px solid rgba(199,191,167,0.14);border-radius:999px;background:rgba(199,191,167,0.08);padding:7px 12px;color:#d3ccb8;font-size:13px;font-weight:700;letter-spacing:-0.02em;">
                Budgetify
              </span>
            </td>
          </tr>
          <tr>
            <td style="border:1px solid #232832;border-radius:24px;background:linear-gradient(180deg,#14181d 0%,#101317 100%);padding:30px 28px 24px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 4px 0;text-align:center;">
              <a
                href="https://nexcode.africa/"
                target="_blank"
                rel="noreferrer"
                style="color:#6d7685;text-decoration:none;font-size:12px;line-height:1.7;"
              >
                a product of NE<span style="color:#ef4444;">X</span>CODE Africa
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

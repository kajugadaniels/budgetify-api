import { buildBaseEmailTemplate } from './base-email.template';

function formatDeletionDate(value: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(value);
}

export function buildAccountDeletionRequestEmail(
  firstName: string | null,
  scheduledFor: Date,
): { subject: string; html: string } {
  const greeting = firstName?.trim() || 'there';
  const deletionDate = formatDeletionDate(scheduledFor);

  return {
    subject: 'Your Budgetify account deletion request was received',
    html: buildBaseEmailTemplate({
      title: 'Account deletion requested',
      previewText:
        'Your account is scheduled for deletion in 30 days unless activity is detected.',
      bodyHtml: `
        <p style="margin:0 0 10px;color:#f6f7f9;font-size:15px;line-height:1.7;">
          Hi ${greeting},
        </p>
        <h1 style="margin:0 0 12px;color:#ffffff;font-size:28px;line-height:1.15;letter-spacing:-0.03em;">
          We received your account deletion request.
        </h1>
        <p style="margin:0 0 18px;color:#a9b1bd;font-size:14px;line-height:1.75;">
          Your Budgetify account is now scheduled for deletion on <span style="color:#f6f7f9;font-weight:700;">${deletionDate}</span>.
        </p>
        <div style="margin:0 0 18px;border:1px solid #232832;border-radius:18px;background:#0d1014;padding:16px 18px;">
          <p style="margin:0;color:#d9dee7;font-size:13px;line-height:1.75;">
            You do not need to do anything else if you want the deletion to continue.
          </p>
        </div>
        <p style="margin:0 0 10px;color:#f6f7f9;font-size:13px;font-weight:700;line-height:1.6;">
          Important
        </p>
        <p style="margin:0;color:#a9b1bd;font-size:13px;line-height:1.75;">
          If any activity happens on your account before that date, including signing in or recording new data, this deletion request will be cancelled automatically.
        </p>
      `,
    }),
  };
}

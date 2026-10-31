# iPhone Shortcut Import Rollout

This runbook applies only to the iPhone Shortcut message-import path. Android
message ingestion remains independent and must not be changed as part of this
rollout.

## Pilot safety rules

- Keep `IPHONE_SHORTCUT_IMPORT_MODE=pilot` until the release gate is met.
- Begin with `MTN_MOMO_RW` as the only enabled provider.
- Never paste a real message, name, phone number, account number, balance,
  credential, or transaction reference into logs, issues, fixtures, or chat.
- Replace sensitive fixture values with deterministic examples such as
  `Test Sender`, `0788123456`, account `1234`, and reference `SAFE1234`.
- Imported records remain pending until the user explicitly confirms them.

## Supervised pilot procedure

1. Install the reviewed Shortcut version shown by the Budgetify setup screen.
2. Confirm that its JSON body includes `shortcutVersion`.
3. Trigger one real payment notification on the pilot iPhone.
4. Confirm that the import appears in Message review as pending.
5. Compare the parsed provider, direction, amount, date, and sender with the
   notification on the device. Do not copy the notification elsewhere.
6. Correct or dismiss the import when any field is wrong.
7. Review the 30-day pilot card after at least the configured minimum sample.
8. When a format fails, create a fully redacted parser fixture and regression
   test before changing the parser.

## Provider release gate

A provider can be added to
`IPHONE_SHORTCUT_IMPORT_ENABLED_PROVIDERS` only when:

- its readiness is `READY_TO_ENABLE` or `MONITORING`;
- the sample size meets `IPHONE_SHORTCUT_IMPORT_ALERT_MINIMUM_SAMPLE_SIZE`;
- its needs-review percentage is below
  `IPHONE_SHORTCUT_IMPORT_ALERT_NEEDS_REVIEW_PERCENT`;
- there are no unresolved duplicate or direction-classification defects; and
- its redacted fixtures cover every observed message format.

Add one provider at a time and observe it for a full pilot window before adding
another provider.

## Shortcut releases

- Increase `IPHONE_SHORTCUT_IMPORT_CURRENT_VERSION` for every published
  Shortcut change.
- Keep `IPHONE_SHORTCUT_IMPORT_MINIMUM_VERSION` unchanged while older versions
  remain safe.
- Set the minimum version only after the replacement link is available and the
  app displays it correctly.
- `pilot` mode reports legacy and outdated imports without rejecting them.
- `enabled` mode returns HTTP 426 for missing or unsupported versions.

## Retention and operational events

The API runs retention on startup and then at
`IPHONE_SHORTCUT_IMPORT_CLEANUP_INTERVAL_MINUTES`:

- expired pending imports become `EXPIRED`;
- encrypted raw messages are removed from expired and terminal imports; and
- overlapping cleanup runs are ignored safely.

Monitor these structured events:

- `iphone_shortcut_import`: one privacy-safe import outcome;
- `iphone_shortcut_pilot_health_alert`: review rate exceeded its threshold;
- `financial_message_retention`: aggregate cleanup counts; and
- `financial_message_retention_failed`: cleanup failed and needs investigation.

None of these events may include a user ID, message text, sender identity,
phone number, account number, balance, token, or transaction reference.

## Rollback

1. Set `IPHONE_SHORTCUT_IMPORT_MODE=disabled` to stop new Shortcut imports.
2. Restart the API so the configuration is reloaded.
3. Keep review endpoints available so users can resolve existing pending items.
4. Fix the parser with redacted fixtures and tests.
5. Return to `pilot`; do not jump directly back to `enabled`.

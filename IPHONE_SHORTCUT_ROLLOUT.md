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

## Step 13: production deployment gate

Do not create a real Shortcut credential until this gate passes.

1. Confirm the shared server environment contains the required iPhone import
   values. Never print either secret.
2. Keep the rollout limited to:

   ```env
   IPHONE_SHORTCUT_IMPORT_MODE=pilot
   IPHONE_SHORTCUT_IMPORT_ENABLED_PROVIDERS=MTN_MOMO_RW
   IPHONE_SHORTCUT_IMPORT_CURRENT_VERSION=1
   IPHONE_SHORTCUT_IMPORT_MINIMUM_VERSION=1
   ```

3. Deploy the exact `main` commit through GitHub Actions.
4. On the server, run the privacy-safe verifier as the deployment user:

   ```bash
   sudo -iu budgetify
   cd /var/www/budgetify/api
   bash deploy/verify-iphone-shortcut-pilot.sh
   ```

5. The verifier must confirm the shared environment permissions and symlink,
   pilot scope, PM2 status, local and public HTTPS health, and the Shortcut
   endpoint's unauthenticated `401` response.
6. Open Budgetify on the pilot iPhone and confirm that Message review and
   iPhone import setup both load successfully.

Stop the rollout when any check fails. Fix the failed check and rerun the
deployment gate; do not bypass it.

## Step 14: Shortcut v1 supervised MTN pilot

Use one unlocked pilot iPhone. Do not change Android permissions, message
ingestion, or automation behavior.

### Create the scoped credential

1. Sign in to Budgetify on the pilot iPhone.
2. Open **History → actions → Review iPhone imports**.
3. Open **iPhone Shortcut setup**.
4. Enter a recognizable device name and create the secure credential.
5. Copy the one-time authorization token and request URL directly into the
   Shortcut. Never send them through chat, email, screenshots, or source code.
6. Clear the clipboard after both values are saved in the Shortcut.

### Build Budgetify MTN Import v1

In Apple Shortcuts, create a shortcut named `Budgetify MTN Import v1` with
these actions in this order:

1. **Generate UUID**. Keep this value as `clientEventId` for the current run.
2. **Current Date**.
3. **Format Date** using ISO 8601 with the timezone included.
4. **Get Contents of URL** using the request URL copied from Budgetify.
5. Set the method to `POST` and the request body to `JSON`.
6. Add the header `Authorization` with the value `Bearer [one-time token]`.
7. Configure the JSON body exactly as follows:

   | Key | Shortcut value |
   | --- | --- |
   | `clientEventId` | Output from **Generate UUID** |
   | `shortcutVersion` | Number `1` |
   | `sourceHint` | Text `MTN_MOMO` |
   | `messageSender` | Sender from the Messages automation input |
   | `message` | Content from the Messages automation input |
   | `messageReceivedAt` | ISO 8601 output from **Format Date** |

The Shortcut must generate one UUID per message and reuse that same UUID only
when retrying that message. It must never generate a second UUID merely because
the same request is retried.

### Create the Messages automation

1. Open **Shortcuts → Automation → New Automation → Message**.
2. Select only the verified MTN MoMo sender used on the pilot phone.
3. Select **Run Immediately** and disable run notifications when iOS offers
   that option.
4. Run `Budgetify MTN Import v1` and pass the received Message as its input.
5. Do not add bank or Airtel senders to this pilot automation.

### Accept the first pilot import

1. Trigger one genuine MTN MoMo payment notification.
2. Confirm the automation finishes without displaying or logging the token.
3. Open Budgetify Message review and confirm the import is `Pending`.
4. Compare the provider, direction, amount, date, sender, fee, and reference
   with the notification on the phone. Do not copy the notification elsewhere.
5. Correct any wrong field before confirming. Dismiss the import if its source
   or meaning is uncertain.
6. Confirm the import and verify exactly one received transaction is created.
7. Run the same request again only as a controlled replay check and verify it
   does not create a duplicate import or transaction.
8. Revoke the pilot credential immediately if its token was exposed.

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

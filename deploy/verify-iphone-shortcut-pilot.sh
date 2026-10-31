#!/usr/bin/env bash

set -euo pipefail

readonly ENV_FILE="${BUDGETIFY_ENV_FILE:-/var/www/budgetify/shared/api/.env.production}"
readonly APP_DIR="${BUDGETIFY_APP_DIR:-/var/www/budgetify/api}"
readonly PM2_APP_NAME="${BUDGETIFY_PM2_APP_NAME:-budgetify-api}"

fail() {
  printf 'FAILED: %s\n' "$1" >&2
  exit 1
}

pass() {
  printf 'OK: %s\n' "$1"
}

read_env_value() {
  local key="$1"
  local value

  value="$(sed -n "s/^${key}=//p" "$ENV_FILE" | tail -n 1 | tr -d '\r')"
  value="${value#\"}"
  value="${value%\"}"
  printf '%s' "$value"
}

require_env_value() {
  local key="$1"
  local value

  value="$(read_env_value "$key")"
  [[ -n "$value" ]] || fail "${key} is missing from the shared production environment"
}

[[ -f "$ENV_FILE" ]] || fail "shared production environment not found at ${ENV_FILE}"
pass 'shared production environment exists'

permissions="$(stat -c '%a' "$ENV_FILE")"
[[ "$permissions" == '600' ]] || fail "production environment permissions are ${permissions}; expected 600"
pass 'production environment permissions are restricted'

require_env_value 'IPHONE_SHORTCUT_IMPORT_TOKEN_PEPPER'
require_env_value 'IPHONE_SHORTCUT_IMPORT_MESSAGE_ENCRYPTION_KEY'
require_env_value 'IPHONE_SHORTCUT_IMPORT_MODE'
require_env_value 'IPHONE_SHORTCUT_IMPORT_ENABLED_PROVIDERS'
require_env_value 'IPHONE_SHORTCUT_IMPORT_CURRENT_VERSION'
require_env_value 'IPHONE_SHORTCUT_IMPORT_MINIMUM_VERSION'
pass 'required iPhone import configuration is present'

mode="$(read_env_value 'IPHONE_SHORTCUT_IMPORT_MODE')"
[[ "$mode" == 'pilot' ]] || fail "iPhone import mode must remain pilot during Step 13"

providers="$(read_env_value 'IPHONE_SHORTCUT_IMPORT_ENABLED_PROVIDERS')"
[[ "$providers" == 'MTN_MOMO_RW' ]] || fail "Step 13 must enable only MTN_MOMO_RW"
pass 'pilot mode is limited to MTN MoMo Rwanda'

current_version="$(read_env_value 'IPHONE_SHORTCUT_IMPORT_CURRENT_VERSION')"
minimum_version="$(read_env_value 'IPHONE_SHORTCUT_IMPORT_MINIMUM_VERSION')"
[[ "$current_version" == '1' ]] || fail 'current Shortcut version must be 1 for the first pilot'
[[ "$minimum_version" == '1' ]] || fail 'minimum Shortcut version must be 1 for the first pilot'
pass 'Shortcut version gate is configured for v1'

[[ -L "${APP_DIR}/.env.production" ]] || fail "${APP_DIR}/.env.production is not a symlink"

resolved_env="$(readlink -f "${APP_DIR}/.env.production")"
resolved_shared_env="$(readlink -f "$ENV_FILE")"
[[ "$resolved_env" == "$resolved_shared_env" ]] || fail 'live release does not use the shared production environment'
pass 'live release uses the shared production environment'

pm2_status="$(pm2 jlist | node -e '
let body = "";
process.stdin.on("data", (chunk) => { body += chunk; });
process.stdin.on("end", () => {
  const name = process.argv[1];
  const processInfo = JSON.parse(body).find((item) => item.name === name);
  process.stdout.write(processInfo?.pm2_env?.status ?? "missing");
});
' "$PM2_APP_NAME")"
[[ "$pm2_status" == 'online' ]] || fail "PM2 application ${PM2_APP_NAME} is ${pm2_status}"
pass 'PM2 application is online'

port="$(read_env_value 'PORT')"
port="${port:-4010}"
curl --fail --silent --show-error --max-time 10 \
  "http://127.0.0.1:${port}/api/v1/docs" >/dev/null
pass 'local API health check passed'

public_api_url="$(read_env_value 'PUBLIC_API_URL')"
[[ "$public_api_url" == https://* ]] || fail 'PUBLIC_API_URL must be an HTTPS URL'
public_api_url="${public_api_url%/}"

curl --fail --silent --show-error --max-time 15 \
  "${public_api_url}/api/v1/docs" >/dev/null
pass 'public HTTPS API health check passed'

shortcut_status="$(curl --silent --output /dev/null --write-out '%{http_code}' \
  --max-time 15 \
  --request POST \
  --header 'Content-Type: application/json' \
  --data '{}' \
  "${public_api_url}/api/v1/financial-message-imports/shortcut")"
[[ "$shortcut_status" == '401' ]] || fail "Shortcut endpoint guard returned HTTP ${shortcut_status}; expected 401 without a credential"
pass 'Shortcut endpoint is public, reachable, and credential-protected'

printf '\nBudgetify iPhone Shortcut pilot verification passed.\n'

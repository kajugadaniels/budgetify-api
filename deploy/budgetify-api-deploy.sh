#!/usr/bin/env bash

set -Eeuo pipefail

readonly PROJECT_NAME="budgetify"
readonly APP_NAME="budgetify-api"
readonly BASE_DIR="/var/www/${PROJECT_NAME}"
readonly RELEASES_DIR="${BASE_DIR}/releases/api"
readonly SHARED_ENV="${BASE_DIR}/shared/api/.env.production"
readonly LIVE_LINK="${BASE_DIR}/api"
readonly INCOMING_DIR="${BASE_DIR}/incoming"
readonly PM2_CONFIG="${BASE_DIR}/shared/pm2/budgetify-api.ecosystem.config.cjs"
readonly DEPLOY_LOCK="${BASE_DIR}/shared/budgetify-api-deploy.lock"
readonly HEALTH_URL="http://127.0.0.1:4010/api/v1/docs"

if [[ "$#" -ne 1 ]]; then
  printf 'Usage: %s <40-character-git-sha>\n' "$0" >&2
  exit 64
fi

readonly GIT_SHA="$1"

if [[ ! "$GIT_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  printf 'Invalid Git commit SHA: %s\n' "$GIT_SHA" >&2
  exit 64
fi

readonly ARCHIVE_PATH="${INCOMING_DIR}/${APP_NAME}-${GIT_SHA}.tar.gz"
readonly RELEASE_NAME="$(date -u +%Y%m%d%H%M%S)-${GIT_SHA:0:12}"
readonly RELEASE_DIR="${RELEASES_DIR}/${RELEASE_NAME}"
readonly NEXT_LINK="${BASE_DIR}/.api-next-${GIT_SHA:0:12}"

exec 9>"$DEPLOY_LOCK"

if ! flock -n 9; then
  printf 'Another Budgetify API deployment is already running.\n' >&2
  exit 75
fi

if [[ ! -f "$ARCHIVE_PATH" || -L "$ARCHIVE_PATH" ]]; then
  printf 'Deployment archive not found: %s\n' "$ARCHIVE_PATH" >&2
  exit 66
fi

if [[ ! -f "$SHARED_ENV" || -L "$SHARED_ENV" ]]; then
  printf 'Production environment file not found: %s\n' "$SHARED_ENV" >&2
  exit 78
fi

if [[ "$(stat -c '%a' "$SHARED_ENV")" != "600" ]]; then
  printf 'Production environment file must have permission 600.\n' >&2
  exit 78
fi

if [[ ! -f "$PM2_CONFIG" || -L "$PM2_CONFIG" ]]; then
  printf 'PM2 configuration not found: %s\n' "$PM2_CONFIG" >&2
  exit 78
fi

if tar -tzf "$ARCHIVE_PATH" | grep -Eq '(^/|(^|/)\.\.(/|$))'; then
  printf 'Deployment archive contains an unsafe path.\n' >&2
  exit 65
fi

previous_release="$(readlink -f "$LIVE_LINK" 2>/dev/null || true)"
switched_release=0
deployment_succeeded=0

cleanup() {
  local status="$?"
  trap - EXIT

  rm -f -- "$NEXT_LINK" "$ARCHIVE_PATH"

  if [[ "$deployment_succeeded" -eq 0 ]]; then
    if [[ "$switched_release" -eq 1 ]]; then
      if [[ -n "$previous_release" && -d "$previous_release" ]]; then
        ln -s "$previous_release" "$NEXT_LINK"
        mv -Tf "$NEXT_LINK" "$LIVE_LINK"
        pm2 startOrReload "$PM2_CONFIG" --env production --update-env || true
      else
        rm -f -- "$LIVE_LINK"
        pm2 delete "$APP_NAME" || true
      fi
    fi

    rm -rf -- "$RELEASE_DIR"
  fi

  exit "$status"
}

trap cleanup EXIT

install -d -m 750 "$RELEASE_DIR"
tar -xzf "$ARCHIVE_PATH" -C "$RELEASE_DIR" --no-same-owner
ln -s "$SHARED_ENV" "${RELEASE_DIR}/.env.production"

cd "$RELEASE_DIR"

npm ci --include=dev --no-audit --no-fund
NODE_ENV=production npm run build
NODE_ENV=production npm run prisma:migrate:deploy
npm prune --omit=dev --no-audit --no-fund

ln -s "$RELEASE_DIR" "$NEXT_LINK"
mv -Tf "$NEXT_LINK" "$LIVE_LINK"
switched_release=1

pm2 startOrReload "$PM2_CONFIG" --env production --update-env

health_check_passed=0

for attempt in $(seq 1 30); do
  if curl --fail --silent --show-error --max-time 5 "$HEALTH_URL" >/dev/null; then
    health_check_passed=1
    break
  fi

  sleep 2
done

if [[ "$health_check_passed" -ne 1 ]]; then
  printf 'Budgetify API failed its health check after deployment.\n' >&2
  exit 1
fi

pm2 save

find "$RELEASES_DIR" \
  -mindepth 1 \
  -maxdepth 1 \
  -type d \
  ! -name "$RELEASE_NAME" \
  -exec rm -rf -- {} +

deployment_succeeded=1

printf 'Budgetify API deployed commit %s as release %s.\n' \
  "$GIT_SHA" \
  "$RELEASE_NAME"

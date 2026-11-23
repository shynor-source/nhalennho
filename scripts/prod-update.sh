#!/bin/sh
# Safe production update: validate, backup, then rebuild/start WITHOUT deleting
# volumes. Never run `docker compose down -v` on production.
# Usage: ./scripts/prod-update.sh [env-file] [compose-file]
set -eu
cd "$(dirname "$0")/.."

ENV_FILE="${1:-.env.production}"
COMPOSE_FILE="${2:-compose.prod.yml}"

echo "==> Validating Compose configuration"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config > /dev/null

echo "==> Backing up before update"
./scripts/backup.sh "$ENV_FILE" "$COMPOSE_FILE"

echo "==> Building and starting (named volumes preserved)"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build

echo "==> Done. Application data stays in the pgdata/uploads volumes."
echo "    Never run 'down -v' on production unless the owner explicitly asks."

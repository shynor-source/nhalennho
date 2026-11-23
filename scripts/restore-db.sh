#!/bin/sh
# Restore a database dump into the production database.
# DESTRUCTIVE: replaces database content. Requires explicit confirmation and a
# fresh backup first. Only run when the owner explicitly asks for a restore.
# Usage: ./scripts/restore-db.sh [env-file] [compose-file] <db-dump-file>
set -eu
cd "$(dirname "$0")/.."

ENV_FILE="${1:-.env.production}"
COMPOSE_FILE="${2:-compose.prod.yml}"
DUMP="${3:-}"

if [ -z "$DUMP" ] || [ ! -f "$DUMP" ]; then
  echo "usage: $0 <env-file> <compose-file> <db-dump-file>" >&2
  exit 1
fi

echo "WARNING: this replaces the current database content."
printf "Type RESTORE to continue: "
read -r ANSWER
[ "$ANSWER" = "RESTORE" ] || { echo "Aborted."; exit 1; }

echo "==> Taking a safety backup first"
./scripts/backup.sh "$ENV_FILE" "$COMPOSE_FILE"

echo "==> Restoring"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T database \
  sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' \
  < "$DUMP"

echo "==> Restore complete. Verify the application."

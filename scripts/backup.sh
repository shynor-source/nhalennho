#!/bin/sh
# Backup the production database + uploads.
# Usage: ./scripts/backup.sh [env-file] [compose-file]
# Defaults: .env.production compose.prod.yml
set -eu
cd "$(dirname "$0")/.."

ENV_FILE="${1:-.env.production}"
COMPOSE_FILE="${2:-compose.prod.yml}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$BACKUP_DIR"

echo "==> Dumping database"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T database \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' \
  > "$BACKUP_DIR/db-$TS.dump"

echo "==> Archiving uploads"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T backend \
  sh -c 'tar -czf - -C /data uploads' \
  > "$BACKUP_DIR/uploads-$TS.tar.gz"

# Backups are not application data; rotate old local copies.
find "$BACKUP_DIR" -type f -name 'db-*.dump' -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -type f -name 'uploads-*.tar.gz' -mtime +"$RETENTION_DAYS" -delete

echo "==> Backup complete:"
ls -lh "$BACKUP_DIR/db-$TS.dump" "$BACKUP_DIR/uploads-$TS.tar.gz"
echo "Copy these files off the VPS (rclone/scp) for real disaster recovery."

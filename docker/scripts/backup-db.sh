#!/bin/sh
# Mercy Dosa House — PostgreSQL backup script
# Usage: ./backup-db.sh
# Cron:  0 2 * * * /opt/mercy-dosa-house/docker/scripts/backup-db.sh >> /var/log/mdh-backup.log 2>&1

set -eu

BACKUP_DIR="${BACKUP_DIR:-/opt/mercy-dosa-house/backups}"
RETAIN_DAYS="${RETAIN_DAYS:-14}"
TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"
FILENAME="mdh-${TIMESTAMP}.sql.gz"

POSTGRES_USER="${POSTGRES_USER:-mdh}"
POSTGRES_DB="${POSTGRES_DB:-mdh}"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"

mkdir -p "$BACKUP_DIR"

echo "[$(date -Iseconds)] Starting backup → ${BACKUP_DIR}/${FILENAME}"

if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q postgres; then
  docker compose -f /opt/mercy-dosa-house/docker/docker-compose.prod.yml exec -T postgres \
    pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "${BACKUP_DIR}/${FILENAME}"
else
  pg_dump -h "$POSTGRES_HOST" -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "${BACKUP_DIR}/${FILENAME}"
fi

find "$BACKUP_DIR" -name 'mdh-*.sql.gz' -mtime +"$RETAIN_DAYS" -delete

echo "[$(date -Iseconds)] Backup complete ($(du -h "${BACKUP_DIR}/${FILENAME}" | cut -f1))"

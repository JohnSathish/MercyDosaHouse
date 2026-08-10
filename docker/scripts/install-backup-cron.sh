#!/bin/sh
# Install daily pg_dump cron on VPS (run once as root)
# Usage: sudo ./install-backup-cron.sh

set -eu

SCRIPT="/opt/mercy-dosa-house/docker/scripts/backup-db.sh"
CRON_LINE="0 2 * * * ${SCRIPT} >> /var/log/mdh-backup.log 2>&1"

chmod +x "$SCRIPT"
mkdir -p /opt/mercy-dosa-house/backups
touch /var/log/mdh-backup.log

if crontab -l 2>/dev/null | grep -q "mdh-backup"; then
  echo "Backup cron already installed."
else
  (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
  echo "Installed daily backup at 2:00 AM → /var/log/mdh-backup.log"
fi

echo "Manual test: ${SCRIPT}"

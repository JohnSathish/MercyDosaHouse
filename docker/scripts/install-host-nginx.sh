#!/bin/bash
# Install Mercy Dosa House nginx config on the HOST (does not restart unrelated sites)
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/mercy-dosa-house}"
CONF_SRC="${REPO_DIR}/docker/nginx-host-mercydosahouse.conf"
CONF_DEST="/etc/nginx/sites-available/mercydosahouse.conf"
ENABLED="/etc/nginx/sites-enabled/mercydosahouse.conf"

if [ ! -f "$CONF_SRC" ]; then
  echo "Missing config: $CONF_SRC"
  exit 1
fi

mkdir -p /var/www/certbot

cp "$CONF_SRC" "$CONF_DEST"
ln -sf "$CONF_DEST" "$ENABLED"

nginx -t
systemctl reload nginx

echo "Host nginx updated — mercydosahouse.com routes added (existing sites untouched)."

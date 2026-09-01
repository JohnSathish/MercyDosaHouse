#!/bin/bash
# Wipe trial orders and customer profiles on the VPS.
# Keeps menu, CMS, settings, inventory, staff/admin users, and invoices.
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/mercy-dosa-house}"
COMPOSE_FILE="${COMPOSE_FILE:-docker/docker-compose.prod.coexist.yml}"
SQL_FILE="${REPO_DIR}/backend/api/prisma/scripts/truncate-orders.sql"

cd "$REPO_DIR"

if [ ! -f "$SQL_FILE" ]; then
  echo "Missing $SQL_FILE — git pull first."
  exit 1
fi

echo "=== Wiping MDH orders and customer profiles ==="
echo "Invoices, menu, settings, and staff accounts are kept."

docker compose --env-file .env -f "$COMPOSE_FILE" exec -T postgres \
  sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < "$SQL_FILE"

echo "Done. Refresh Admin → Orders and Customers — both should be empty."
echo "New live orders will start at MDH-<today>-000001."

#!/bin/bash
# Truncate all trial orders on the VPS (keeps menu/customers/settings).
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/mercy-dosa-house}"
COMPOSE_FILE="${COMPOSE_FILE:-docker/docker-compose.prod.coexist.yml}"

cd "$REPO_DIR"

echo "=== Truncating MDH orders (trial data) ==="
docker compose --env-file .env -f "$COMPOSE_FILE" exec -T api \
  npx prisma db execute --schema prisma/schema.prisma --file prisma/scripts/truncate-orders.sql

echo "Done. Refresh Admin → Dashboard / Orders — Recent Orders should be empty."

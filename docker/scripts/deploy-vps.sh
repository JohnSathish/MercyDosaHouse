#!/bin/bash
# Mercy Dosa House — VPS deploy (coexists with other apps on same server)
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/mercy-dosa-house}"
COMPOSE_FILE="docker/docker-compose.prod.coexist.yml"
BRANCH="${DEPLOY_BRANCH:-main}"

echo "=== Mercy Dosa House deploy ==="
echo "Target: $REPO_DIR"

command -v docker >/dev/null || { echo "Docker required"; exit 1; }
command -v git >/dev/null || { echo "Git required"; exit 1; }

if [ ! -d "$REPO_DIR/.git" ]; then
  echo "Clone repo into $REPO_DIR first, then re-run."
  exit 1
fi

cd "$REPO_DIR"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

if [ ! -f .env ]; then
  echo "Missing .env — copy .env.example and fill secrets first."
  exit 1
fi

# Read port overrides without `source .env` (values like EMAIL_FROM=<...> break bash)
read_env() {
  local key="$1"
  local default="${2:-}"
  local val
  val=$(grep -E "^${key}=" .env 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '\r')
  val="${val%\"}"
  val="${val#\"}"
  val="${val%\'}"
  val="${val#\'}"
  if [ -n "$val" ]; then
    echo "$val"
  else
    echo "$default"
  fi
}

MDH_WEBSITE_PORT=$(read_env MDH_WEBSITE_PORT 13000)
MDH_API_PORT=$(read_env MDH_API_PORT 13001)
MDH_ADMIN_PORT=$(read_env MDH_ADMIN_PORT 13002)

echo "Building and starting containers (localhost ports only)..."
docker compose --env-file .env -f "$COMPOSE_FILE" up -d --build

echo "Waiting for API health..."
for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${MDH_API_PORT}/api/v1/health/ready" >/dev/null 2>&1; then
    echo "API is healthy."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "API health check timed out — last API logs:"
    docker compose --env-file .env -f "$COMPOSE_FILE" logs api --tail 80 || true
    echo "If Prisma reports a failed migration, run:"
    echo "  docker compose --env-file .env -f $COMPOSE_FILE exec -T api npx prisma migrate resolve --rolled-back 20260901120000_inventory_procurement"
    echo "  docker compose --env-file .env -f $COMPOSE_FILE exec -T api npx prisma migrate resolve --rolled-back 20260901150000_staff_inbox_notifications"
    echo "then: docker compose --env-file .env -f $COMPOSE_FILE up -d api"
    echo "API health check timed out — check: docker compose -f $COMPOSE_FILE logs api"
    exit 1
  fi
  sleep 5
done

echo "Applying database migrations..."
docker compose --env-file .env -f "$COMPOSE_FILE" exec -T api npx prisma migrate deploy

if [ -x docker/scripts/install-host-nginx.sh ]; then
  echo "Updating host nginx..."
  bash docker/scripts/install-host-nginx.sh
fi

echo ""
echo "Deploy complete."
echo "  Website: http://127.0.0.1:${MDH_WEBSITE_PORT}"
echo "  API:     http://127.0.0.1:${MDH_API_PORT}/api/v1/health"
echo "  Admin:   http://127.0.0.1:${MDH_ADMIN_PORT}"
echo ""
echo "Next: point DNS to this VPS, then run certbot for HTTPS:"
echo "  certbot --nginx -d mercydosahouse.com -d www.mercydosahouse.com -d admin.mercydosahouse.com"

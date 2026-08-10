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

# Load port overrides
set -a
# shellcheck disable=SC1091
source .env
set +a

echo "Building and starting containers (localhost ports only)..."
docker compose -f "$COMPOSE_FILE" up -d --build

echo "Waiting for API health..."
for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${MDH_API_PORT:-13001}/api/v1/health/ready" >/dev/null 2>&1; then
    echo "API is healthy."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "API health check timed out — check: docker compose -f $COMPOSE_FILE logs api"
    exit 1
  fi
  sleep 5
done

if [ -x docker/scripts/install-host-nginx.sh ]; then
  echo "Updating host nginx..."
  bash docker/scripts/install-host-nginx.sh
fi

echo ""
echo "Deploy complete."
echo "  Website: http://127.0.0.1:${MDH_WEBSITE_PORT:-13000}"
echo "  API:     http://127.0.0.1:${MDH_API_PORT:-13001}/api/v1/health"
echo "  Admin:   http://127.0.0.1:${MDH_ADMIN_PORT:-13002}"
echo ""
echo "Next: point DNS to this VPS, then run certbot for HTTPS:"
echo "  certbot --nginx -d mercydosahouse.com -d www.mercydosahouse.com -d admin.mercydosahouse.com"

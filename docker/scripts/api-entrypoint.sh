#!/bin/sh
# Run inside API container or via: docker compose exec api sh docker/scripts/api-entrypoint.sh
set -eu

echo "=== MDH API startup ==="
echo "NODE_ENV=${NODE_ENV:-}"
echo "RUN_SEED=${RUN_SEED:-false}"

npx prisma migrate deploy

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "Running database seed..."
  node prisma/seed.js
else
  echo "Skipping seed (set RUN_SEED=true for first deploy only)"
fi

exec node dist/main.js

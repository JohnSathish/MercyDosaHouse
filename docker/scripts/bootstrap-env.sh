#!/bin/bash
# Generate production .env with random secrets (run once on VPS)
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/mercy-dosa-house}"
ENV_FILE="${REPO_DIR}/.env"

if [ -f "$ENV_FILE" ]; then
  echo ".env already exists — not overwriting."
  exit 0
fi

JWT_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
POSTGRES_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"

cat > "$ENV_FILE" <<EOF
NODE_ENV=production

POSTGRES_USER=mdh
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=mdh

DATABASE_URL=postgresql://mdh:${POSTGRES_PASSWORD}@postgres:5432/mdh?schema=public
REDIS_URL=redis://redis:6379

JWT_SECRET=${JWT_SECRET}
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

API_PORT=3001
API_HOST=0.0.0.0
CORS_ORIGINS=https://mercydosahouse.com,https://www.mercydosahouse.com,https://admin.mercydosahouse.com

NEXT_PUBLIC_SITE_URL=https://mercydosahouse.com
NEXT_PUBLIC_WEBSITE_URL=https://mercydosahouse.com
NEXT_PUBLIC_ADMIN_URL=https://admin.mercydosahouse.com
NEXT_PUBLIC_API_URL=https://mercydosahouse.com/api/v1

UPLOAD_DIR=/app/uploads
STORAGE_PUBLIC_URL=https://mercydosahouse.com/uploads

# Localhost ports — do not conflict with other apps on this VPS
MDH_WEBSITE_PORT=13000
MDH_API_PORT=13001
MDH_ADMIN_PORT=13002

SMS_PROVIDER=none
EMAIL_PROVIDER=none
EMAIL_FROM=Mercy Dosa House <orders@mercydosahouse.com>

RUN_SEED=true
SEED_ADMIN_EMAIL=admin@mercydosahouse.com
SEED_ADMIN_PASSWORD=CHANGE_ME_AFTER_FIRST_LOGIN
EOF

chmod 600 "$ENV_FILE"
echo "Created $ENV_FILE with random secrets."
echo "Edit SEED_ADMIN_PASSWORD, then deploy. Set RUN_SEED=false after first successful deploy."

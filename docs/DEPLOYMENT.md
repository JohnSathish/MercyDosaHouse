# Mercy Dosa House — Deployment Guide

## Hostinger VPS Setup

### 1. Server Requirements

- Ubuntu 22.04+
- 2GB+ RAM
- Docker + Docker Compose installed
- Existing apps on the same VPS are **not disturbed** (see Coexist Mode below)

### 2. Coexist Mode (shared VPS — recommended)

When other sites already use ports 80/443, **do not** start the Docker nginx container.
Instead:

1. Run MDH containers on **localhost-only** ports (`13000`, `13001`, `13002`)
2. Add **server blocks** to the **host** nginx (existing nginx keeps handling other sites)

```bash
git clone <repo-url> /opt/mercy-dosa-house
cd /opt/mercy-dosa-house
bash docker/scripts/bootstrap-env.sh   # creates .env with random secrets
nano .env                              # set SEED_ADMIN_PASSWORD, optional SMS/email keys
bash docker/scripts/deploy-vps.sh
```

This installs `/etc/nginx/sites-available/mercydosahouse.conf` and reloads nginx
without stopping other enabled sites.

**Compose file:** `docker/docker-compose.prod.coexist.yml`

### 3. Free maps and routing configuration

The admin live-delivery maps use OpenStreetMap tiles and do not require Google Maps billing.
For road distance, ETA, and route geometry, create a free OpenRouteService API key and add
these values to the VPS `.env`:

```env
ROUTING_PROVIDER=openrouteservice
OPENROUTESERVICE_API_KEY=replace-with-your-openrouteservice-key
OPENROUTESERVICE_BASE_URL=https://api.openrouteservice.org
```

The API key stays server-side. If it is unavailable, the admin map still shows customer and
agent coordinates, but route distance and ETA may be unavailable.

### 4. Standalone Mode (dedicated VPS)

If this server is only for Mercy Dosa House:

```bash
docker compose -f docker/docker-compose.prod.yml up -d --build
```

Uses bundled nginx on ports 80/443.

### 5. SSL with Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d mercydosahouse.com -d www.mercydosahouse.com -d admin.mercydosahouse.com
```

After first deploy with `RUN_SEED=true`, set `RUN_SEED=false` in `.env` and redeploy.

### 6. DNS Records

| Subdomain | Type | Value  |
| --------- | ---- | ------ |
| @         | A    | VPS IP |
| www       | A    | VPS IP |
| admin     | A    | VPS IP |

### 7. Backups

```bash
bash docker/scripts/install-backup-cron.sh
```

### 8. GitHub Actions Deploy

Set secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`

Tag a release: `git tag v0.1.0 && git push origin v0.1.0`

Deploy script on VPS: `docker/scripts/deploy-vps.sh`

### 9. Verify

```bash
curl -s http://127.0.0.1:13001/api/v1/health/ready
curl -sI https://mercydosahouse.com/api/v1/health
```

Admin login (after seed): `admin@mercydosahouse.com` — change password immediately.

### 10. Promotional popup migration

The popup system extends the existing `announcements` table and adds
`announcement_analytics_events`. After pulling the release on the VPS, apply the
checked-in migration before restarting the API:

```bash
cd /opt/mercy-dosa-house
docker compose -f docker/docker-compose.prod.coexist.yml run --rm api pnpm exec prisma migrate deploy
docker compose -f docker/docker-compose.prod.coexist.yml up -d --build api admin website
```

Then open **Admin → Marketing → Popup Management** to upload a poster and create
the campaign. The public homepage selects only the highest-priority eligible
published popup; scheduling and expiry are evaluated by the API, so no cron job
is required. The upload must use the existing authenticated `/media/upload`
endpoint, and customer analytics are sent to `/marketing/analytics/track`.

### 11. Push notification delivery

Android builds register native FCM tokens. The API therefore requires the
Firebase service-account JSON in the VPS root `.env`; keep it on one line and
never expose it to the website or mobile app:

```env
FIREBASE_SERVICE_ACCOUNT_JSON=<compact-service-account-json>
```

After updating the environment, apply migrations and recreate the API:

```bash
cd /opt/mercy-dosa-house
docker compose -f docker/docker-compose.prod.coexist.yml run --rm api pnpm exec prisma migrate deploy
docker compose -f docker/docker-compose.prod.coexist.yml up -d api
```

Use **Admin → Settings → Notifications → Delivery diagnostics** to confirm
the FCM service account is configured and that device tokens are registered.
Use **Test Notification** before changing an order. Failed customer status
events remain in the dispatch log and are retried automatically.

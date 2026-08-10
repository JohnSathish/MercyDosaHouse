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

### 3. Standalone Mode (dedicated VPS)

If this server is only for Mercy Dosa House:

```bash
docker compose -f docker/docker-compose.prod.yml up -d --build
```

Uses bundled nginx on ports 80/443.

### 4. SSL with Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d mercydosahouse.com -d www.mercydosahouse.com -d admin.mercydosahouse.com
```

After first deploy with `RUN_SEED=true`, set `RUN_SEED=false` in `.env` and redeploy.

### 5. DNS Records

| Subdomain | Type | Value  |
| --------- | ---- | ------ |
| @         | A    | VPS IP |
| www       | A    | VPS IP |
| admin     | A    | VPS IP |

### 6. Backups

```bash
bash docker/scripts/install-backup-cron.sh
```

### 7. GitHub Actions Deploy

Set secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`

Tag a release: `git tag v0.1.0 && git push origin v0.1.0`

Deploy script on VPS: `docker/scripts/deploy-vps.sh`

### 8. Verify

```bash
curl -s http://127.0.0.1:13001/api/v1/health/ready
curl -sI https://mercydosahouse.com/api/v1/health
```

Admin login (after seed): `admin@mercydosahouse.com` — change password immediately.

# Mercy Dosa House — Deployment Guide

## Hostinger VPS Setup

### 1. Server Requirements

- Ubuntu 22.04+
- 2GB+ RAM
- Docker + Docker Compose installed

### 2. Initial Setup

```bash
git clone <repo-url> /opt/mercy-dosa-house
cd /opt/mercy-dosa-house
cp .env.example .env
# Edit .env with production values
```

### 3. SSL with Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d mercydosahouse.com -d admin.mercydosahouse.com
```

### 4. Start Services

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

### 5. DNS Records

| Subdomain | Type | Value  |
| --------- | ---- | ------ |
| @         | A    | VPS IP |
| admin     | A    | VPS IP |
| kitchen   | A    | VPS IP |
| delivery  | A    | VPS IP |

### 6. GitHub Actions Deploy

Set secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`

Tag a release: `git tag v0.1.0 && git push origin v0.1.0`

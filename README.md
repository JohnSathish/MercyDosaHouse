# Mercy Dosa House

**Freshly Made. Delivered with Love.**

Modern cloud-based restaurant ordering platform.

## Stack

- **Frontend:** Next.js 15, React 19, TypeScript, TailwindCSS, Shadcn UI
- **Backend:** NestJS, Prisma, PostgreSQL, Redis, Socket.IO, BullMQ
- **Mobile:** React Native (Phase 4)
- **Deploy:** Docker, NGINX, GitHub Actions, Hostinger VPS

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 10+
- PostgreSQL 16
- Redis 7

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment
cp .env.example .env
cp .env backend/api/.env

# Start infrastructure
docker compose -f docker/docker-compose.yml up postgres redis -d

# Database
pnpm db:generate
pnpm db:push
pnpm db:seed

# Build shared packages
pnpm --filter @mdh/types build
pnpm --filter @mdh/utils build
pnpm --filter @mdh/auth-client build
pnpm --filter @mdh/sdk build

# Start development
pnpm dev:core
```

### URLs (Development)

| App      | URL                            |
| -------- | ------------------------------ |
| Website  | http://localhost:3000          |
| Admin    | http://localhost:3002          |
| Kitchen  | http://localhost:3003          |
| Delivery | http://localhost:3004          |
| API      | http://localhost:3001/api/v1   |
| API Docs | http://localhost:3001/api/docs |

### Default Admin Login

- Email: `admin@mercydosahouse.com`
- Password: `Admin@12345`

### Dev OTP

Phone login uses OTP `123456` in development mode.

## Project Structure

```
apps/website      Customer website (PWA)
apps/admin        Admin dashboard
apps/kitchen      Kitchen dashboard
apps/delivery     Delivery dashboard
backend/api       NestJS API
packages/         Shared packages (@mdh/*)
mobile/react-native  Android app (Phase 4)
docker/           Docker & NGINX config
docs/             Documentation
```

## Scripts

| Command           | Description           |
| ----------------- | --------------------- |
| `pnpm dev`        | Start all apps        |
| `pnpm dev:core`   | API + Website + Admin |
| `pnpm build`      | Build all packages    |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:seed`    | Seed database         |

## License

Proprietary — BaseCode Labs Pvt Ltd

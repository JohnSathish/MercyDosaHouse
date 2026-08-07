# Mercy Dosa House — Architecture

## Overview

pnpm + Turborepo monorepo with four Next.js 15 frontends, NestJS modular monolith API, shared packages, and React Native mobile (Phase 4).

## Structure

```
apps/website     — Customer PWA
apps/admin       — Admin dashboard
apps/kitchen     — Kitchen large-screen UI
apps/delivery    — Delivery staff mobile UI
backend/api      — NestJS REST API + Socket.IO
packages/        — Shared ui, types, utils, sdk, auth-client
mobile/react-native — Android app (Phase 4)
docker/          — Docker Compose + NGINX
```

## API Modules

auth, users, categories, products, orders, payments, settings, media, dashboard, kitchen, delivery, coupons, notifications, reviews, reports, audit

## Database

PostgreSQL with Prisma ORM. Single schema at `backend/api/prisma/schema.prisma`.

## Real-time

Socket.IO namespace `/orders` for live order tracking.

## Storage

VPS local disk at `/uploads` with S3-compatible adapter interface for future R2/S3 migration.

# Mercy Dosa House — Production Readiness Checklist

**Production URL:** [https://mercydosahouse.com](https://mercydosahouse.com)  
**Last reviewed:** August 2026  
**Status:** Architecturally ready — external service credentials pending

---

## Legend

| Symbol | Meaning                                                                        |
| ------ | ------------------------------------------------------------------------------ |
| ✅     | Complete and production-ready                                                  |
| ⚙️     | **Configuration Pending** — add env vars / credentials; no code rebuild needed |
| 🔶     | Partially complete — works with limitations                                    |
| ❌     | Not yet implemented                                                            |

---

## 1. Production Environment

| Item                                 | Status | Notes                                                     |
| ------------------------------------ | ------ | --------------------------------------------------------- |
| Separate dev/prod env templates      | ✅     | `.env.example` (prod), `.env.development.example` (local) |
| Secrets via environment variables    | ✅     | JWT, DB, Redis, SMS, email, payments                      |
| No secrets in frontend code          | ✅     | Only `NEXT_PUBLIC_*` public URLs                          |
| Production domain configured         | ✅     | Defaults to `https://mercydosahouse.com`                  |
| Localhost removed from prod defaults | ✅     | Website/admin `app-urls.ts` updated                       |
| `.env` gitignored                    | ✅     | Root + mobile                                             |
| Docker production compose            | ✅     | `docker/docker-compose.prod.yml`                          |
| Next.js standalone builds            | ✅     | Website + admin `output: 'standalone'`                    |
| Docker web CMD fix (admin)           | ✅     | `Dockerfile.web` uses `$APP_NAME`                         |

**Action required before go-live:**

```bash
cp .env.example .env          # Fill all REPLACE_* values on VPS
openssl rand -base64 48       # Generate JWT_SECRET
# Set POSTGRES_PASSWORD, CORS_ORIGINS, NEXT_PUBLIC_* at build time
```

---

## 2. OTP / SMS — ⚙️ Configuration Pending

| Item                                          | Status | Notes                                                         |
| --------------------------------------------- | ------ | ------------------------------------------------------------- |
| OTP architecture (Redis storage, verify flow) | ✅     | `auth.service.ts`                                             |
| SMS provider abstraction                      | ✅     | MSG91, Twilio, Fast2SMS via `SmsService`                      |
| Provider env configuration                    | ✅     | `SMS_PROVIDER`, `MSG91_*`, `TWILIO_*`, `FAST2SMS_*`           |
| Graceful degradation when unconfigured        | ✅     | Returns 503: _"Verification service temporarily unavailable"_ |
| No fake OTP in production                     | ✅     | Dev-only `123456` fallback                                    |
| OTP rate limiting (60s cooldown)              | ✅     | Redis cooldown key                                            |
| Auth endpoint rate limits                     | ✅     | 5 OTP sends/min, 10 verify/min                                |
| OTP status endpoint                           | ✅     | `GET /api/v1/auth/otp/status`                                 |
| Website blocked when SMS missing              | ❌     | Email + Google login remain available                         |

**To enable SMS:** Set in `.env`:

```env
SMS_PROVIDER=msg91
MSG91_AUTH_KEY=your_key
MSG91_SENDER_ID=MDHOSA
MSG91_OTP_TEMPLATE_ID=your_dlt_template_id
```

Restart API only — no website/mobile rebuild required.

---

## 3. Email — ⚙️ Configuration Pending

| Item                              | Status | Notes                                        |
| --------------------------------- | ------ | -------------------------------------------- |
| Email service architecture        | ✅     | `EmailService` with Resend + SMTP            |
| Provider env configuration        | ✅     | `EMAIL_PROVIDER`, `RESEND_API_KEY`, `SMTP_*` |
| Graceful skip when unconfigured   | ✅     | Orders proceed; emails logged not sent       |
| Order confirmation email template | 🔶     | Method ready; not wired to order create yet  |
| Password reset email              | ❌     | Architecture ready; endpoint not built       |

**To enable email:** Set in `.env`:

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxx
EMAIL_FROM=Mercy Dosa House <orders@mercydosahouse.com>
```

---

## 4. Customer Authentication

| Item                         | Status | Notes                                            |
| ---------------------------- | ------ | ------------------------------------------------ |
| Phone OTP login              | 🔶     | ⚙️ SMS pending; architecture ready               |
| Email/password login         | ✅     | Admin + staff                                    |
| Google OAuth                 | ⚙️     | Requires `GOOGLE_CLIENT_ID`                      |
| JWT access + refresh tokens  | ✅     | 15m access / 7d refresh                          |
| Session persistence (client) | ✅     | `@mdh/auth-client` localStorage                  |
| Secure token handling        | ✅     | Bearer header; refresh rotation                  |
| Customer profile             | ✅     | `/users/me`                                      |
| Saved addresses (multiple)   | ✅     | Checkout profile API                             |
| Default address              | ✅     | `isDefault` flag                                 |
| Order history                | ✅     | Dashboard + profile                              |
| Reorder                      | 🔶     | Order history visible; one-click reorder partial |
| Account deletion             | 🔶     | Verify `/users/me` delete endpoint               |
| Blocked account check        | ✅     | `isBlocked` on login + JWT validate              |
| Saved address at checkout    | ✅     | Auto-selects default address                     |
| Auth error handling          | ✅     | User-friendly messages                           |

---

## 5. Ordering System

| Item                                                 | Status | Notes                                            |
| ---------------------------------------------------- | ------ | ------------------------------------------------ |
| Server-side total recalculation                      | ✅     | `orders.service.ts` — never trusts client totals |
| Delivery charge (free threshold)                     | ✅     | `calculateDeliveryCharge()` shared utils         |
| Per-item packing charges                             | ✅     | From product DB                                  |
| Pre-order discount                                   | ✅     | Scheduled delivery validation                    |
| Coupon validation server-side                        | ✅     | Re-validated at order create                     |
| Reward points server-side                            | ✅     | Balance checked on server                        |
| POS billing recalculation                            | ✅     | `pos.service.ts` `recalculateBill()`             |
| Order types (Dine-in/Takeaway/Delivery/Pickup/Staff) | ✅     | POS + online                                     |
| Client/server total consistency                      | ✅     | Same `@mdh/utils` formulas                       |
| Order quote endpoint                                 | ❌     | Recommended: `POST /orders/quote`                |

---

## 6. Admin-Controlled Website

| Item                              | Status | Notes                    |
| --------------------------------- | ------ | ------------------------ |
| Menu items, prices, availability  | ✅     | Admin Menu Management    |
| Categories & images               | ✅     | Admin CMS                |
| Delivery charges & free threshold | ✅     | Admin Settings           |
| Packing charges (per item)        | ✅     | Admin Menu               |
| Delivery areas & times            | ✅     | Marketing Hub → Delivery |
| Announcements & promos            | ✅     | Marketing Hub            |
| Homepage content                  | ✅     | CMS Home Page Builder    |
| Pre-order items                   | ✅     | Marketing announcements  |
| Offers                            | ✅     | CMS Offers               |
| Contact info                      | ✅     | Admin Settings           |
| Changes without redeploy          | ✅     | API-driven content       |

---

## 7. Production Security

| Item                           | Status | Notes                                                  |
| ------------------------------ | ------ | ------------------------------------------------------ |
| Helmet HTTP headers            | ✅     | `main.ts`                                              |
| CORS (production origins)      | ✅     | `CORS_ORIGINS` env required in prod                    |
| Global rate limiting           | ✅     | 100 req/min                                            |
| Auth rate limiting             | ✅     | Stricter on `/auth/*`                                  |
| JWT secret validation (prod)   | ✅     | `assertProductionEnv()` — min 32 chars                 |
| Password hashing (bcrypt)      | ✅     | Login + POS PIN                                        |
| RBAC permissions               | ✅     | `@RequirePermissions()` on admin routes                |
| Input validation               | ✅     | Global `ValidationPipe`                                |
| Production error filter        | ✅     | No stack traces to clients                             |
| Swagger disabled in production | ✅     | Dev only                                               |
| SQL injection protection       | ✅     | Prisma parameterized queries                           |
| Price manipulation protection  | ✅     | Server recalculates from DB prices                     |
| Public order tracking          | 🔶     | Anyone with order number can track — consider OTP gate |
| WebSocket CORS `*`             | ✅     | Uses `CORS_ORIGINS` / production domains               |
| CSRF                           | 🔶     | JWT Bearer — low risk for API; review cookie usage     |
| Payment webhook verification   | ✅     | Razorpay HMAC signature + amount check                 |
| Order quote endpoint           | ✅     | `POST /api/v1/orders/quote`                            |
| Order confirmation email       | ✅     | Wired on create (graceful if email unconfigured)       |

---

## 8. Database

| Item                         | Status | Notes                                                  |
| ---------------------------- | ------ | ------------------------------------------------------ |
| Prisma migrations            | ✅     | All migrations in `prisma/migrations/`                 |
| Foreign keys & indexes       | ✅     | Schema defined                                         |
| Timestamps (created/updated) | ✅     | On core models                                         |
| Order immutability           | 🔶     | Status updates allowed; line items locked after create |
| Backup procedure             | ✅     | `docker/scripts/backup-db.sh` + cron installer         |
| Seed on production           | ✅     | Only when `RUN_SEED=true` (first deploy)               |

**Production backup (recommended cron):**

```bash
pg_dump -U mdh mdh | gzip > /backups/mdh-$(date +%F).sql.gz
```

---

## 9. API Production Readiness

| Item                         | Status | Notes                                      |
| ---------------------------- | ------ | ------------------------------------------ |
| Consistent HTTP status codes | ✅     | NestJS exceptions                          |
| Validation error messages    | ✅     | Class-validator                            |
| Authentication enforced      | ✅     | Global JWT guard + `@Public()` opt-out     |
| Permissions enforced         | ✅     | PermissionsGuard                           |
| Health check                 | ✅     | `GET /api/v1/health` (DB + Redis probes)   |
| Readiness probe              | ✅     | `GET /api/v1/health/ready`                 |
| Pagination (products/orders) | 🔶     | Products paginated; some lists unpaginated |
| Swagger (dev only)           | ✅     | Disabled when `NODE_ENV=production`        |

---

## 10. Payment System

| Item                                     | Status | Notes                                                |
| ---------------------------------------- | ------ | ---------------------------------------------------- |
| COD                                      | ✅     | Works without gateway                                |
| UPI (manual confirm)                     | ✅     | Admin confirms payment                               |
| Razorpay/Cashfree                        | 🔶     | Create-order + webhook ready; ⚙️ credentials pending |
| Server-side payment verification         | ❌     | ⚙️ Pending gateway credentials                       |
| Webhook idempotency                      | ❌     | Pending gateway                                      |
| Orders not marked paid by frontend alone | ✅     | Payment status server-controlled                     |

---

## 11–12. POS & KDS

| Item                         | Status | Notes                                           |
| ---------------------------- | ------ | ----------------------------------------------- |
| POS order types              | ✅     | Dine-in, takeaway, delivery, pickup, staff meal |
| POS → central orders         | ✅     | Same `orders` table                             |
| KDS status flow              | ✅     | New → Preparing → Ready → Completed             |
| Real-time WebSocket updates  | ✅     | Socket.io                                       |
| POS not in Docker prod stack | 🔶     | Deploy separately or add to compose             |
| Thermal receipt printing     | ✅     | Configurable in Admin Settings                  |

---

## 13. Error Handling & UX

| Item                          | Status | Notes                                |
| ----------------------------- | ------ | ------------------------------------ |
| 404 page                      | ✅     | `apps/website/src/app/not-found.tsx` |
| Error boundary                | ✅     | `error.tsx` + `global-error.tsx`     |
| API error messages (customer) | ✅     | Production filter hides internals    |
| Loading skeletons             | ✅     | Homepage, menu                       |
| Empty states                  | ✅     | Cart, menu, orders                   |
| Offline detection             | ❌     | Recommended PWA enhancement          |

---

## 14. Performance

| Item                                   | Status | Notes                          |
| -------------------------------------- | ------ | ------------------------------ |
| Next.js image optimization (AVIF/WebP) | ✅     | Website next.config            |
| Code splitting                         | ✅     | Next.js App Router default     |
| API caching (React Query)              | ✅     | Client-side staleTime          |
| Lazy loading (images)                  | ✅     | Next/Image                     |
| Database query optimization            | 🔶     | Review N+1 on order lists      |
| Homepage CMS server prefetch           | ✅     | Layout fetches CMS + marketing |

---

## 15. SEO & Social Sharing

| Item                          | Status | Notes                                      |
| ----------------------------- | ------ | ------------------------------------------ |
| Meta title & description      | ✅     | Root layout                                |
| Open Graph + Twitter cards    | ✅     | Root layout                                |
| Canonical URLs                | ✅     | `alternates.canonical`                     |
| Sitemap                       | ✅     | `/sitemap.xml` — production URL            |
| Robots.txt                    | ✅     | `/robots.txt`                              |
| Restaurant JSON-LD schema     | ✅     | `RestaurantJsonLd` component               |
| Favicon & PWA manifest        | ✅     | `/manifest.json`, icons                    |
| Production domain in metadata | ✅     | `metadataBase: https://mercydosahouse.com` |

---

## 16. PWA / Mobile / Android

| Item                                | Status | Notes                           |
| ----------------------------------- | ------ | ------------------------------- |
| Shared backend API                  | ✅     | Website + Android + Admin + POS |
| Shared billing utils (`@mdh/utils`) | ✅     | Single source of truth          |
| Mobile config API                   | ✅     | `/mobile/config`                |
| Android env example                 | ✅     | `mobile/customer/.env.example`  |
| PWA service worker                  | ❌     | Optional future enhancement     |

---

## 17. Deployment

| Item                       | Status | Notes                                  |
| -------------------------- | ------ | -------------------------------------- |
| Production Docker compose  | ✅     | `docker/docker-compose.prod.yml`       |
| GitHub Actions deploy      | ✅     | Tag-triggered (`v*`)                   |
| HTTPS (Certbot)            | ⚙️     | See `docs/DEPLOYMENT.md`               |
| Health checks in compose   | ✅     | API `/health/ready`                    |
| Zero localhost in prod env | ✅     | `.env.example` uses mercydosahouse.com |
| Deployment documentation   | ✅     | `docs/DEPLOYMENT.md`                   |

### Go-Live Commands

```bash
# On VPS
git clone <repo> /opt/mercy-dosa-house
cd /opt/mercy-dosa-house
cp .env.example .env   # Edit with production secrets

docker compose -f docker/docker-compose.prod.yml up -d --build
docker compose -f docker/docker-compose.prod.yml exec api npx prisma migrate deploy

# Verify
curl https://mercydosahouse.com/api/v1/health
curl https://mercydosahouse.com/api/v1/auth/otp/status
```

---

## 18. Environment Variables Summary

| Variable                       | Required (Prod) | Status                                 |
| ------------------------------ | --------------- | -------------------------------------- |
| `DATABASE_URL`                 | Yes             | ⚙️ Set on VPS                          |
| `REDIS_URL`                    | Yes             | ⚙️ Set on VPS                          |
| `JWT_SECRET`                   | Yes             | ⚙️ Generate strong secret              |
| `CORS_ORIGINS`                 | Yes             | ⚙️ `https://mercydosahouse.com,...`    |
| `NEXT_PUBLIC_API_URL`          | Yes (build)     | ⚙️ `https://mercydosahouse.com/api/v1` |
| `NEXT_PUBLIC_SITE_URL`         | Yes (build)     | ⚙️ `https://mercydosahouse.com`        |
| `SMS_PROVIDER` + credentials   | No              | ⚙️ **Configuration Pending**           |
| `EMAIL_PROVIDER` + credentials | No              | ⚙️ **Configuration Pending**           |
| `RAZORPAY_*`                   | No              | ⚙️ **Configuration Pending**           |
| `GOOGLE_CLIENT_ID`             | No              | ⚙️ Optional                            |
| `FCM_SERVER_KEY`               | No              | ⚙️ Optional push notifications         |

---

## 19. Pre-Launch Test Plan

Run automated checks:

```bash
pnpm test:prelaunch
# Production:
SITE_URL=https://mercydosahouse.com API_URL=https://mercydosahouse.com/api/v1 pnpm test:prelaunch
```

### Customer flow

- [ ] Browse menu at https://mercydosahouse.com/menu
- [ ] Add items — verify packing + delivery charges shown
- [ ] Login (email or Google while SMS pending)
- [ ] Checkout with saved address
- [ ] Place COD order — verify confirmation total matches cart
- [ ] Track order by order number

### Restaurant flow

- [ ] Admin login at admin.mercydosahouse.com
- [ ] POS create dine-in order
- [ ] KDS receives order → mark Preparing → Ready
- [ ] Complete order

### Admin flow

- [ ] Change delivery charge in Settings → verify website reflects
- [ ] Update menu price → verify website menu
- [ ] Publish marketing announcement → verify homepage

---

## Summary

| Area                       | Ready?                                                    |
| -------------------------- | --------------------------------------------------------- |
| Core ordering (COD)        | ✅ **Ready to launch**                                    |
| Website + Admin + API      | ✅ **Ready to launch**                                    |
| SMS/OTP                    | ⚙️ **Configuration Pending** — app works via email/Google |
| Email notifications        | ⚙️ **Configuration Pending** — orders not blocked         |
| Online payments (Razorpay) | ⚙️ **Configuration Pending** — COD works                  |
| Push notifications (FCM)   | ⚙️ **Configuration Pending**                              |

**The application is architecturally production-ready.** Configure SMS, email, and payment credentials through environment variables when available — no frontend or mobile rebuild required.

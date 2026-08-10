# Mercy Dosa House — Customer App (Phase 1)

Expo React Native Android app. **Fully CMS-driven** — branding, homepage, features, and pricing rules load from Admin.

## Quick Start

```bash
# 1. Start API (required)
pnpm dev:api

# 2. Start mobile app
pnpm dev:mobile
# Press 'a' → Android emulator
# Or scan QR with Expo Go on your phone
```

## Build

```bash
# JS bundle export (validates build)
pnpm build:mobile
# Output: mobile/customer/dist/

# Production APK (requires EAS account)
cd mobile/customer
pnpm build:android:cloud
```

## Screens

| Screen   | Description                                        |
| -------- | -------------------------------------------------- |
| Splash   | CMS branding + remote config bootstrap             |
| Login    | OTP + guest checkout (CMS flag)                    |
| Home     | CMS homepage sections (hero, categories, popular…) |
| Menu     | Live categories & products from API                |
| Product  | Item detail + add to cart                          |
| Cart     | Live pricing (packing, delivery from CMS)          |
| Checkout | Order summary (Phase 2: Razorpay/COD)              |
| Orders   | Order history                                      |
| Profile  | User info, support, logout                         |

## API

Base URL auto-appends `/api/v1`:

| Environment      | `.env` value               |
| ---------------- | -------------------------- |
| Android emulator | `http://10.0.2.2:3001`     |
| Physical device  | `http://<your-pc-ip>:3001` |

## Admin CMS

Configure without Play Store updates: **Admin → Mobile App** (`/cms/mobile`)

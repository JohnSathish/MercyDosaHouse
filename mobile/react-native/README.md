# Mercy Dosa House — Mobile Apps

Three synchronized Android apps sharing one CMS-driven backend:

| App                    | Folder                       | Purpose                     |
| ---------------------- | ---------------------------- | --------------------------- |
| **Customer App**       | `mobile/customer/` (planned) | Ordering, tracking, loyalty |
| **Mercy POS**          | `mobile/pos/` (planned)      | Cashier billing             |
| **Kitchen & Delivery** | `mobile/staff/` (planned)    | KDS + delivery partner      |

## CMS-Driven Architecture

**No hardcoded business content.** All branding, homepage layout, offers, announcements, feature flags, payment methods, and store settings are fetched from:

```
GET /mobile/config
```

Admin controls everything from **Admin Panel → Mobile App** (`/cms/mobile`).

Shared client: `@mdh/mobile-shared` in `mobile/shared/`.

## Remote Config Includes

- App branding (name, logo, splash)
- Theme colors & dark/light mode
- Homepage section builder (enable/disable, reorder)
- Offers, announcements, banners
- Feature toggles (14 flags)
- Delivery & business settings
- Payment method enable/disable
- Maintenance mode & force update
- Store open/close & emergency notices
- FAQs & help contacts

## Live Data (not in config bundle)

Menu items, prices, stock, and coupons are fetched separately from existing APIs — admin changes appear instantly without app updates:

- `GET /categories?active=true&channel=mobile`
- `GET /products?available=true`
- `GET /coupons/validate`
- `GET /orders/:id` + Socket.IO for tracking

## Setup (Phase 1 — Customer App)

```bash
cd mobile/customer
npx create-expo-app@latest . --template blank-typescript
pnpm add @mdh/mobile-shared @mdh/types @mdh/sdk @mdh/utils
```

See `mobile/shared/README.md` for config bootstrap example.

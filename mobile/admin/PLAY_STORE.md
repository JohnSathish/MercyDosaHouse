# MDH Admin — Google Play Console Guide

Package: `com.mercydosahouse.admin`  
Version: **1.0.4** (versionCode **5**) — Expo SDK **53**  
Privacy policy: https://mercydosahouse.com/privacy

## Ready AAB

- Expo build: https://expo.dev/accounts/johnsathish/projects/mercy-dosa-house-admin/builds/45e7f289-b03b-4e44-a7b4-44e53de131ec
- Artifact: https://expo.dev/artifacts/eas/WJH_8QNL8DTYEp6UfLlrhF93RMzYOLYTUBX3LrRPlK4.aab
- Local copy: `mobile/admin/releases/mdh-admin-v1.0.4-vc5-sdk53.aab`
- Includes custom new-order ringtone (`new_order.wav`) + high-priority `new_orders` channel
- Previous vc4: `mobile/admin/releases/mdh-admin-v1.0.3-vc4-sdk53.aab`

## Create app (Play Console)

| Field            | Value                                      |
| ---------------- | ------------------------------------------ |
| App name         | `MDH Admin` (or `Mercy Dosa House Admin`)  |
| Default language | English (United States) or English (India) |
| App or game      | App                                        |
| Free or paid     | Free                                       |

## Store listing

**Short description (≤80 chars):**

```
Staff app for Mercy Dosa House — orders, POS, menu & live kitchen ops.
```

**Full description:**

```
MDH Admin is the staff operations app for Mercy Dosa House.

Manage live restaurant operations from your phone:
• View today’s dashboard and KPIs
• Accept and update customer orders
• Run POS / walk-in billing
• Manage menu availability
• Track preparing / ready / completed orders
• Change store open/closed status

This app is for authorized Mercy Dosa House staff only.
Unauthorized use is not allowed.

Support: info@mercydosahouse.com
Website: https://mercydosahouse.com
Admin web: https://admin.mercydosahouse.com
```

| Field          | Value                              |
| -------------- | ---------------------------------- |
| Category       | Business (or Food & Drink)         |
| Email          | info@mercydosahouse.com            |
| Phone          | +91 95636 36365                    |
| Website        | https://admin.mercydosahouse.com   |
| Privacy policy | https://mercydosahouse.com/privacy |
| App icon       | `mobile/admin/assets/icon.png`     |

## App access (reviewer login)

Select: **Some or all functionality is restricted**

| Field    | Value                    |
| -------- | ------------------------ |
| Name     | Staff admin login        |
| Username | admin@mercydosahouse.com |
| Password | Admin@12345              |

(Other info — paste:)

```
This app is staff-only. Login with email + password on the first screen.

1. Open MDH Admin
2. Enter email: admin@mercydosahouse.com
3. Enter password: Admin@12345
4. Tap Login

Reviewers can access Dashboard, Orders, POS, Menu, and More.
No biometric, QR, or geo-gate is required.
API: https://mercydosahouse.com/api/v1
```

Change this password after Play review if needed.

## Release checklist

1. Countries/regions: select at least **India** (or All countries)
2. Upload AAB to Internal testing first
3. If Play shows **16 KB page size** error: see note below
4. Complete Data safety / content rating / ads declarations
5. Internal test install → then Production

## 16 KB page size note

Both mobile apps are currently on **Expo SDK 52**, which does **not** fully meet Google’s 16 KB native library requirement.
True fix = upgrade to **Expo SDK 53+** and rebuild AAB.
Use Play’s “Proceed anyway” only if Google still allows draft rollout; it may block final publish.

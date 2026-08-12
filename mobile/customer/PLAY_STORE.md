# Mercy Dosa House — Customer Android (Play Console)

Package: `com.mercydosahouse.customer`  
Version: **1.0.8** (versionCode **9**) — Expo SDK **53** (16 KB support)  
Privacy policy (required): https://mercydosahouse.com/privacy

## 1. Build production AAB (EAS cloud)

```powershell
cd mobile/customer
pnpm install
pnpm build:android:production
```

**SDK 53 build (v1.0.8 / versionCode 9)** — use this for Play Console (fixes 16 KB error):

- Expo page: https://expo.dev/accounts/johnsathish/projects/mercy-dosa-house/builds/dab3d59b-4cc5-45f0-830d-553588dfb876
- AAB: https://expo.dev/artifacts/eas/C3DLCJDqweov7fG-cYxec6xkK-0GCNNtWr_rfzwz098.aab
- Local: `mobile/customer/releases/mercy-dosa-house-customer-v1.0.8-vc9-sdk53.aab`

When a new build finishes, download the `.aab` from the Expo build page (or use the artifact URL printed in the terminal).

> Discard / replace the older **1.0.7 (vc8)** AAB — it fails Google’s 16 KB page-size check on Expo SDK 52.## 2. Play Console — create / open the app

1. Go to [Google Play Console](https://play.google.com/console) → Create app (or open existing).
2. App name: **Mercy Dosa House**
3. Default language: English (India) or English
4. App type: App · Free · Declarations as needed

## 3. Store listing checklist

| Field              | Suggested value                                                                       |
| ------------------ | ------------------------------------------------------------------------------------- |
| Short description  | Order crispy dosas, idli & more from Mercy Dosa House — Tura.                         |
| Full description   | Browse the menu, place delivery or pickup orders, track status, and manage addresses. |
| App icon           | Use `assets/icon.png` (1024×1024)                                                     |
| Feature graphic    | 1024×500 (create in Canva if needed)                                                  |
| Phone screenshots  | 2–8 shots from a real device / emulator                                               |
| Privacy policy URL | https://mercydosahouse.com/privacy                                                    |
| Category           | Food & Drink                                                                          |
| Contact email      | info@mercydosahouse.com                                                               |
| Contact phone      | +91 95636 36365                                                                       |

## 4. App content / Data safety (summary)

- Collects: name, phone, email (optional), delivery address, order history
- Purpose: account + order fulfillment
- Shared with: hosting / OTP / payment providers as needed
- Encrypted in transit: Yes (HTTPS)
- Users can request deletion via support email

Complete the official Data safety form in Play Console to match the privacy policy.

## 5. Upload the AAB

1. **Release** → **Testing** → **Internal testing** (recommended first) or Production.
2. Create a new release → Upload the `.aab` from EAS.
3. Add release notes (e.g. “Initial Play Store release — order online from Mercy Dosa House”).
4. Review and roll out to the chosen track.

Signing: EAS manages the upload keystore for this Expo project. Keep the Expo account credentials safe; you need the same keystore for every future update.

## 6. Before production go-live

- [ ] Privacy page live on production site (`/privacy`)
- [ ] API `https://mercydosahouse.com/api/v1` healthy
- [ ] Internal test install works (login, menu, place order)
- [ ] Content rating questionnaire completed
- [ ] Target audience / ads / news-app declarations completed

## Optional: submit from CLI

After linking a Google Play service account JSON to EAS:

```powershell
pnpm submit:android
```

Otherwise upload the AAB manually in Play Console.

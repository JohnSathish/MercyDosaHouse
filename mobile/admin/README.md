# MDH Admin Android App

Expo React Native admin control center for Mercy Dosa House operations.

- Package: `@mdh/admin-app`
- Android application id: `com.mercydosahouse.admin`
- Current Play version: `1.0.5` (versionCode `6`)
- API: `EXPO_PUBLIC_API_URL` (defaults to production)

## Local run

```bash
pnpm --filter @mdh/admin-app start
# or from root
pnpm dev:admin-app
```

Staff login: email/password or phone OTP against `/api/v1/auth/*`.

## Play Console release

Build production AAB:

```bash
cd mobile/admin
pnpm install
pnpm build:android:production
```

After build completes, download the `.aab` artifact from the Expo build page and upload it to Google Play Console (Internal testing first).

Optional EAS submit (after service account setup):

```bash
pnpm submit:android
```

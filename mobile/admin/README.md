# MDH Admin Android App

Expo React Native admin control center for Mercy Dosa House ERP.

- Package: `@mdh/admin-app` / Android id `com.mercydosahouse.admin`
- API: `EXPO_PUBLIC_API_URL` (default production)

```bash
pnpm --filter @mdh/admin-app start
# or from root
pnpm dev:admin-app
```

Staff login: email/password or phone OTP against `/api/v1/auth/*`.

EAS: `pnpm --filter @mdh/admin-app build:android` (testing APK). Create an EAS project and replace `extra.eas.projectId` in `app.config.js` before cloud builds.

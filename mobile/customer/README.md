# Mercy Dosa House — Android Customer App

Production Expo app (`mobile/customer`) for ordering from https://mercydosahouse.com.

**Play Console guide:** see [PLAY_STORE.md](./PLAY_STORE.md)

## Production configuration

Set in `.env` (copy from `.env.example`):

```env
EXPO_PUBLIC_API_URL=https://mercydosahouse.com/api/v1
EXPO_PUBLIC_WEBSITE_URL=https://mercydosahouse.com
ANDROID_APP_CHANNEL_SECRET=
```

Use the **same** `ANDROID_APP_CHANNEL_SECRET` as `/opt/mercy-dosa-house/.env` on the VPS. It is baked into the APK at build time. These are baked in at **build time**. OTP, email, and payment credentials stay on the server — never commit the secret.

## Build production AAB (Play Store)

```powershell
cd mobile/customer
pnpm install
pnpm build:android:production
```

Downloads as `.aab` from the Expo build page. Upload that file in Play Console.

## Build testing APK (internal / sideload)

```bash
cd mobile/customer
pnpm install
npx eas-cli build --platform android --profile testing
```

## Build release APK (local — requires Android SDK + JDK)

```powershell
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
$env:EXPO_PUBLIC_API_URL="https://mercydosahouse.com/api/v1"
$env:EXPO_PUBLIC_WEBSITE_URL="https://mercydosahouse.com"
$env:NODE_ENV="production"

cd mobile/customer
pnpm prebuild:android
pnpm bundle:android
cd android
.\gradlew.bat assembleRelease -x createBundleReleaseJsAndAssets
```

APK path: `android/app/build/outputs/apk/release/app-release.apk`

## Dev (Expo Go / emulator)

```bash
pnpm dev:mobile   # from repo root
```

For local API on emulator only:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3001/api/v1
```

## App ID

- Package: `com.mercydosahouse.customer`
- Version: `1.0.10` (versionCode `11`)
- Privacy: https://mercydosahouse.com/privacy

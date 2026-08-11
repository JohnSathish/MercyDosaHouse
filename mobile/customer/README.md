# Mercy Dosa House — Android Customer App

Production Expo app (`mobile/customer`) for ordering from https://mercydosahouse.com.

## Production configuration

Set in `.env` (copy from `.env.example`):

```env
EXPO_PUBLIC_API_URL=https://mercydosahouse.com/api/v1
EXPO_PUBLIC_WEBSITE_URL=https://mercydosahouse.com
```

These are baked in at **build time**. OTP, email, and payment credentials stay on the server — never in the app.

## Build release APK (recommended: EAS cloud)

```bash
cd mobile/customer
pnpm install
npx eas-cli build --platform android --profile testing
```

Download the APK from the Expo build page when complete.

## Build release APK (local — requires Android SDK + JDK)

```powershell
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
$env:EXPO_PUBLIC_API_URL="https://mercydosahouse.com/api/v1"
$env:EXPO_PUBLIC_WEBSITE_URL="https://mercydosahouse.com"
$env:NODE_ENV="production"

cd mobile/customer
pnpm prebuild:android    # generates android/ (not committed)
pnpm bundle:android      # exports JS bundle to android assets
cd android
.\gradlew.bat assembleRelease -x createBundleReleaseJsAndAssets
```

APK path: `android/app/build/outputs/apk/release/app-release.apk`

Copy to releases folder:

```powershell
mkdir releases -Force
copy android\app\build\outputs\apk\release\app-release.apk releases\mercy-dosa-house-v1.0.1-testing.apk
```

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
- Version: `1.0.1` (versionCode 2)

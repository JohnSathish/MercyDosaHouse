#!/bin/bash
# Pure Android release APK (Linux/macOS with Android SDK, or use EAS cloud instead)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "$ROOT/../.." && pwd)"
cd "$ROOT"

export EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-https://mercydosahouse.com/api/v1}"
export EXPO_PUBLIC_WEBSITE_URL="${EXPO_PUBLIC_WEBSITE_URL:-https://mercydosahouse.com}"

echo "=== Building workspace packages ==="
cd "$REPO_ROOT"
pnpm --filter @mdh/types build
pnpm --filter @mdh/utils build
pnpm --filter @mdh/mobile-shared build

cd "$ROOT"
echo "=== Expo prebuild (android) ==="
npx expo prebuild --platform android --clean

echo "=== Export JS bundle ==="
node scripts/prepare-android-bundle.js

echo "=== Gradle assembleRelease ==="
cd android
./gradlew assembleRelease -x createBundleReleaseJsAndAssets

APK="app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK" ]; then
  mkdir -p ../releases
  OUT="../releases/mercy-dosa-house-v$(node -p "require('../app.config.js')({config:{}}).version)-release.apk"
  cp "$APK" "$OUT"
  echo "APK ready: $OUT"
else
  echo "Build finished but APK not found at $APK"
  exit 1
fi

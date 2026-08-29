# Android build pipeline

The customer and admin apps now use the same build sequence:

1. `pnpm ensure:android` — create the native project only when it is missing.
2. `pnpm bundle:android` — build workspace packages and export one cached Android JS bundle.
3. `pnpm build:android:debug` — assemble the debug APK for Metro/dev-device testing.
4. `pnpm build:android:artifacts` — run `assembleRelease bundleRelease` together so release
   compilation is shared between the APK and AAB.

Run these commands from either `mobile/customer` or `mobile/admin`:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
pnpm install
pnpm run build:android:debug
pnpm run build:android:artifacts
```

`pnpm prebuild:android` remains available for an intentional clean native regeneration.
It should not be part of the normal code-change loop because it discards generated native
outputs and forces Gradle configuration and native compilation again.

## Cache and performance configuration

The Expo config plugin writes the following persistent settings into generated
`android/gradle.properties`:

- Gradle daemon, local build cache, parallel execution, and file-system watching.
- Kotlin incremental compilation and classpath snapshots.
- A 3 GB Gradle heap and 1 GB Metaspace ceiling to prevent the daemon Metaspace
  exhaustion observed during the baseline.
- A fixed Android entrypoint and Metro/dev variant that avoid the monorepo path-resolution
  failure seen on Windows.

The release bundle preparation script no longer clears Metro's cache. Use
`MDH_CLEAR_METRO_CACHE=1 pnpm run bundle:android` only after a deliberate cache reset.
On Windows it also stages Expo Modules Core CMake output under `C:\mdh-cxx\<app>`, avoiding
the long pnpm/repository path that caused Ninja's `manifest ... still dirty` failure.

EAS profiles enable `EAS_USE_CACHE=1` and `EAS_GRADLE_CACHE=1`. The dependency lockfile
controls cache invalidation, so dependency changes rebuild the affected native work while
code-only changes can reuse compiled outputs.

## Baseline measured on this workstation

The first clean native release attempts were blocked before producing an artifact:

- Java 8 launch: failed in about 12 seconds because Expo/RN Gradle plugins require Java 11+.
- Customer with Java 21: 66.33 seconds, failed in Expo Modules Core CMake/Ninja.
- Admin with Java 21: 23.08 seconds, failed in the same long-path CMake/Ninja stage.
- Customer Gradle profile: dependency resolution 2.225 seconds; project configuration
  24.250 seconds; task execution 53.335 seconds. Expo Modules Core clean CMake took
  15.217 seconds, while Kotlin plugin compilation accounted for several additional seconds.
- Gradle and dependency caches were present; no dependency download was observed in the
  baseline, so the repeated delay was native/configuration work rather than cache loss.

After the changes, successful measurements were:

- Customer cached release APK: 7.61 seconds after native outputs were warm.
- Admin first successful optimized release: 153.21 seconds, with 85 tasks from cache.
- Customer release APK + AAB pipeline: about 30 seconds after native outputs were warm.
- Admin release APK + AAB pipeline: about 29 seconds after native outputs were warm.
- Customer debug APK: about 11 seconds with warm Gradle outputs.
- Admin debug APK: about 32 seconds with warm Gradle outputs.
- Customer R8/resource-shrunk APK + AAB validation: 83.5 seconds.
- Admin R8/resource-shrunk APK + AAB validation: 90.3 seconds.

The 30–60 second target is therefore realistic for a warm debug/release cycle; the first
native build after a clean regeneration remains longer because CMake must compile each
configured ABI.

## Artifact locations and verification

Gradle writes:

- `android/app/build/outputs/apk/debug/app-debug.apk`
- `android/app/build/outputs/apk/release/app-release.apk`
- `android/app/build/outputs/bundle/release/app-release.aab`

Verify APK signatures with:

```powershell
$signer = "$env:ANDROID_HOME\build-tools\35.0.0\apksigner.bat"
& $signer verify --verbose android\app\build\outputs\apk\release\app-release.apk
```

The local generated native projects currently use the Expo debug signing configuration for
direct device testing. These local release APK/AAB files are signed and structurally valid,
but must not be uploaded to Play Console. The production EAS profile now enables R8 and
resource shrinking and remains the canonical Play Store build, using EAS-managed signing.
A connected Android device or emulator is also required for install/run verification;
`adb devices` was empty during this audit.

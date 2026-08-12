const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Prefer uncompressed / non-legacy JNI packaging for Android 15+ devices.
 * Full 16 KB page-size native alignment still needs Expo SDK 53+ (RN 0.77+).
 * Do NOT set android.bundle.enableUncompressedNativeLibs — removed in AGP 8.1.
 * @type {import('@expo/config-plugins').ConfigPlugin}
 */
function withAndroid16KbPageSize(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.contents.includes('useLegacyPackaging')) {
      return cfg;
    }
    cfg.modResults.contents = cfg.modResults.contents.replace(
      /android\s*\{/,
      `android {
    packaging {
        jniLibs {
            useLegacyPackaging false
        }
    }
`,
    );
    return cfg;
  });
}

module.exports = withAndroid16KbPageSize;

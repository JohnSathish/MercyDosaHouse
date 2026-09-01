const { withAndroidManifest, withAppBuildGradle } = require('expo/config-plugins');

const BLOCKED_PERMISSIONS = [
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_AUDIO',
  'android.permission.CAMERA',
  'android.permission.RECORD_AUDIO',
  'android.permission.MODIFY_AUDIO_SETTINGS',
  'android.permission.ACCESS_BACKGROUND_LOCATION',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_LOCATION',
  'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
  'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
  'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
];

function ensureOptionalFeature(manifest, name) {
  if (!manifest.manifest['uses-feature']) manifest.manifest['uses-feature'] = [];
  const features = manifest.manifest['uses-feature'];
  const existing = features.find((item) => item.$?.['android:name'] === name);
  if (existing) {
    existing.$['android:required'] = 'false';
    return;
  }
  features.push({ $: { 'android:name': name, 'android:required': 'false' } });
}

function stripUnusedPermissions(manifest) {
  manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
  const existing = manifest.manifest['uses-permission'] || [];
  const kept = existing.filter((item) => !BLOCKED_PERMISSIONS.includes(item.$?.['android:name']));
  const removals = BLOCKED_PERMISSIONS.map((name) => ({
    $: { 'android:name': name, 'tools:node': 'remove' },
  }));
  manifest.manifest['uses-permission'] = [...kept, ...removals];
}

/**
 * Play Console release hardening:
 * - strip unused sensitive / overlay / storage / FGS permissions
 * - optional location hardware so GPS-less devices stay supported
 * - native debug symbols for crash symbolication
 * @type {import('@expo/config-plugins').ConfigPlugin}
 */
function withAndroidPlayRelease(config) {
  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    stripUnusedPermissions(manifest);
    ensureOptionalFeature(manifest, 'android.hardware.location');
    ensureOptionalFeature(manifest, 'android.hardware.location.gps');
    ensureOptionalFeature(manifest, 'android.hardware.location.network');
    return cfg;
  });

  return withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (!contents.includes('debugSymbolLevel')) {
      contents = contents.replace(
        /release \{\s*\n\s*signingConfig/,
        `release {
            ndk { debugSymbolLevel 'SYMBOL_TABLE' }
            signingConfig`,
      );
    }
    contents = contents.replace(/keepDebugSymbols \+= \['\*\*\/\*\.so'\]\s*\n/, '');
    cfg.modResults.contents = contents;
    return cfg;
  });
}

module.exports = withAndroidPlayRelease;

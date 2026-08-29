/** @type {import('expo/config').ExpoConfig} */
const PRODUCTION_API = 'https://mercydosahouse.com/api/v1';
const PRODUCTION_WEBSITE = 'https://mercydosahouse.com';
const PRODUCTION_ADMIN = 'https://admin.mercydosahouse.com';

/** @param {{ config: import('expo/config').ExpoConfig }} ctx */
module.exports = ({ config }) => ({
  ...config,
  name: 'MDH Admin',
  slug: 'mercy-dosa-house-admin',
  version: '1.0.5',
  orientation: 'default',
  scheme: 'mercydosa-admin',
  userInterfaceStyle: 'light',
  newArchEnabled: false,
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#14532D',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#14532D',
    },
    package: 'com.mercydosahouse.admin',
    googleServicesFile: './google-services.json',
    versionCode: 6,
    permissions: [
      'INTERNET',
      'ACCESS_NETWORK_STATE',
      'VIBRATE',
      'RECEIVE_BOOT_COMPLETED',
      'POST_NOTIFICATIONS',
    ],
    allowBackup: false,
  },
  notification: {
    icon: './assets/icon.png',
    color: '#14532D',
    androidMode: 'default',
    androidCollapsedTitle: 'MDH Admin',
  },
  plugins: [
    'expo-router',
    'expo-asset',
    'expo-font',
    'expo-secure-store',
    '../plugins/with-android-build-optimizations',
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#14532D',
        defaultChannel: 'new_orders',
        sounds: ['./assets/sounds/new_order.wav'],
      },
    ],
    'expo-av',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Mercy Dosa House shares your location only while an active delivery is in progress.',
        isAndroidBackgroundLocationEnabled: true,
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          minSdkVersion: 24,
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          buildToolsVersion: '35.0.0',
          usesCleartextTraffic: false,
          useLegacyPackaging: false,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: { origin: false },
    eas: { projectId: 'ad601c99-949e-4336-88f5-4334a8cabe90' },
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? PRODUCTION_API,
    websiteUrl: process.env.EXPO_PUBLIC_WEBSITE_URL ?? PRODUCTION_WEBSITE,
    adminUrl: process.env.EXPO_PUBLIC_ADMIN_URL ?? PRODUCTION_ADMIN,
  },
  owner: 'johnsathish',
});

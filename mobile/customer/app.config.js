/** @type {import('expo/config').ExpoConfig} */
const PRODUCTION_API = 'https://mercydosahouse.com/api/v1';
const PRODUCTION_WEBSITE = 'https://mercydosahouse.com';

/** @param {{ config: import('expo/config').ExpoConfig }} ctx */
module.exports = ({ config }) => ({
  ...config,
  name: 'Mercy Dosa House',
  slug: 'mercy-dosa-house',
  version: '1.0.9',
  orientation: 'portrait',
  scheme: 'mercydosa',
  userInterfaceStyle: 'automatic',
  newArchEnabled: false,
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash-screen.png',
    resizeMode: 'cover',
    backgroundColor: '#123D28',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#123D28',
    },
    package: 'com.mercydosahouse.customer',
    googleServicesFile: './google-services.json',
    versionCode: 10,
    permissions: ['INTERNET', 'ACCESS_NETWORK_STATE', 'POST_NOTIFICATIONS'],
    allowBackup: true,
  },
  notification: {
    icon: './assets/icon.png',
    color: '#123D28',
    androidMode: 'default',
    androidCollapsedTitle: 'Mercy Dosa House',
  },
  plugins: [
    'expo-router',
    'expo-asset',
    'expo-font',
    'expo-web-browser',
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#123D28',
        defaultChannel: 'order_updates',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Mercy Dosa House uses your location to place an accurate delivery pin.',
      },
    ],
    './plugins/with-android-16kb',
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
    eas: { projectId: '7c4ea25c-3039-4162-af72-fcca67b623de' },
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? PRODUCTION_API,
    websiteUrl: process.env.EXPO_PUBLIC_WEBSITE_URL ?? PRODUCTION_WEBSITE,
  },
  owner: 'johnsathish',
});

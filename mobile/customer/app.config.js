/** @type {import('expo/config').ExpoConfig} */
const PRODUCTION_API = 'https://mercydosahouse.com/api/v1';
const PRODUCTION_WEBSITE = 'https://mercydosahouse.com';

/** @param {{ config: import('expo/config').ExpoConfig }} ctx */
module.exports = ({ config }) => ({
  ...config,
  name: 'Mercy Dosa House',
  slug: 'mercy-dosa-house',
  version: '1.0.2',
  orientation: 'portrait',
  scheme: 'mercydosa',
  userInterfaceStyle: 'automatic',
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
    package: 'com.mercydosahouse.customer',
    versionCode: 3,
    permissions: ['INTERNET', 'ACCESS_NETWORK_STATE'],
    allowBackup: true,
  },
  plugins: [
    'expo-router',
    [
      'expo-build-properties',
      {
        android: {
          minSdkVersion: 24,
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          usesCleartextTraffic: false,
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

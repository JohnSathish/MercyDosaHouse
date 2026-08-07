# React Native Mobile App (Phase 4)

Android-first React Native app for Mercy Dosa House.

## Planned Features

- Offline menu cache
- Push notifications (Firebase FCM)
- Live order tracking (Socket.IO)
- Biometric login
- Google Sign-In

## Setup (when implemented)

```bash
cd mobile/react-native
npx react-native init MercyDosaHouse --template react-native-template-typescript
pnpm install
```

## API Integration

Use `@mdh/types` and `@mdh/sdk` patterns adapted for React Native with AsyncStorage for token storage.

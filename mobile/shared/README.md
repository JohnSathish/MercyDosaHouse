# @mdh/mobile-shared

Shared remote-config client for Mercy Dosa House Android apps.

## Purpose

Loads **all business content and settings from the Admin Panel** at runtime — no hardcoded offers, banners, homepage layout, or feature flags in the app binary.

## API

The mobile app calls:

- `GET /mobile/config` — full remote config bundle (branding, theme, homepage layout, offers, announcements, feature flags, payment methods, store status, version control)
- `GET /mobile/config/version` — lightweight version check for background refresh
- `GET /categories?active=true&channel=mobile` — menu categories filtered for mobile

## Usage (React Native)

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MobileConfigStore } from '@mdh/mobile-shared';

const store = new MobileConfigStore({
  apiBaseUrl: 'https://api.mercydosahouse.com',
  storage: AsyncStorage,
  onConfigUpdated: (config) => {
    // Apply theme colors, rebuild home screen sections, etc.
  },
});

// On app launch (splash screen):
const config = await store.bootstrap();

// Check feature flags anywhere:
if (store.isFeatureEnabled('loyalty')) {
  /* show loyalty tab */
}

// Render homepage from CMS layout:
for (const section of store.getHomeSections()) {
  switch (section.sectionKey) {
    case 'hero_banner':
      /* render hero */ break;
    case 'popular_items':
      /* fetch /products?popular=true */ break;
  }
}
```

## Admin Control

Configure everything from **Admin → Website Builder → Mobile App**:

- Branding & splash screen
- Homepage section order and visibility
- Feature toggles (reviews, loyalty, coupons, live tracking, etc.)
- Force update / maintenance mode / store open-close

## Cache Strategy

1. Load cached config instantly (offline splash)
2. Fetch fresh config from API
3. Auto-refresh every `refreshIntervalSeconds` (default 300s)
4. Version bump in admin triggers client refresh on next poll

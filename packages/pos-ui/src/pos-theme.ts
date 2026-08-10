/** Mercy Dosa House POS design tokens */
export const POS_THEME = {
  primary: '#14532D',
  primaryLight: '#166534',
  accent: '#F59E0B',
  accentDark: '#D97706',
  bg: '#EEF0F3',
  surface: '#FFFFFF',
  surfaceGlass: 'rgba(255,255,255,0.85)',
  border: '#E2E8F0',
  text: '#1F2937',
  textMuted: '#64748B',
  radius: '16px',
  shadow: '0 4px 24px rgba(20,83,45,0.08)',
  shadowLg: '0 8px 32px rgba(20,83,45,0.12)',
} as const;

export const POS_MODES_EXTENDED = [
  { value: 'DINE_IN' as const, label: 'Dine In', emoji: '🍽' },
  { value: 'TAKEAWAY' as const, label: 'Takeaway', emoji: '🥡' },
  { value: 'DELIVERY' as const, label: 'Delivery', emoji: '🛵' },
  { value: 'TAKEAWAY' as const, label: 'Walk-in', emoji: '🚶', alias: 'walkin' },
  { value: 'STAFF_MEAL' as const, label: 'Staff Meal', emoji: '👨‍💼' },
  { value: 'ONLINE_PICKUP' as const, label: 'Online Pickup', emoji: '📦' },
];

export type MenuFilter = 'all' | 'veg' | 'nonveg' | 'popular' | 'available';

export const CATEGORY_ICONS: Record<string, string> = {
  dosa: '🥞',
  idli: '🥥',
  meals: '🍛',
  biryani: '🍗',
  drinks: '🥤',
  dessert: '🍨',
  popular: '⭐',
  favorites: '❤️',
  new: '🆕',
  special: '🔥',
};

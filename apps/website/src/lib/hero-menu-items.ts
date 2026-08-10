export interface HeroMenuItem {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  description: string;
  rating: number;
  category: string;
  badge?: string;
  emoji: string;
  extras?: string[];
  featured?: boolean;
  /** Primary glow color for featured-card lighting */
  glowColor: string;
  /** Secondary glow / accent */
  glowSecondary: string;
}

export const HERO_MENU_ITEMS: HeroMenuItem[] = [
  {
    id: 'plain-dosa',
    slug: 'plain-dosa',
    name: 'Plain Dosa',
    image: '/images/plain-dosa.png',
    price: 80,
    description: 'Crispy & classic dosa served with sambar and chutneys.',
    rating: 4.7,
    category: 'Dosa',
    emoji: '🥞',
    glowColor: '#F59E0B',
    glowSecondary: '#FDE68A',
  },
  {
    id: 'masala-dosa',
    slug: 'masala-dosa',
    name: 'Masala Dosa',
    image: '/images/hero-dosa.png',
    price: 100,
    description: 'Crispy dosa filled with spiced potato masala.',
    rating: 4.9,
    category: 'Dosa',
    badge: 'Best Seller',
    emoji: '🌟',
    featured: true,
    glowColor: '#F59E0B',
    glowSecondary: '#FBBF24',
  },
  {
    id: 'paneer-dosa',
    slug: 'paneer-dosa',
    name: 'Paneer Dosa',
    image: '/images/paneer-dosa.png',
    price: 110,
    description: 'Golden dosa stuffed with spiced paneer filling.',
    rating: 4.8,
    category: 'Dosa',
    emoji: '🧀',
    glowColor: '#22C55E',
    glowSecondary: '#86EFAC',
  },
  {
    id: 'cheese-dosa',
    slug: 'cheese-dosa',
    name: 'Cheese Dosa',
    image: '/images/cheese-dosa.png',
    price: 120,
    description: 'Crispy dosa loaded with melted cheese.',
    rating: 4.8,
    category: 'Dosa',
    emoji: '🧀',
    glowColor: '#FB923C',
    glowSecondary: '#FDBA74',
  },
  {
    id: 'onion-dosa',
    slug: 'onion-dosa',
    name: 'Onion Dosa',
    image: '/images/onion-dosa.png',
    price: 100,
    description: 'Crispy dosa topped with caramelized onions & herbs.',
    rating: 4.7,
    category: 'Dosa',
    emoji: '🧅',
    glowColor: '#A78BFA',
    glowSecondary: '#C4B5FD',
  },
  {
    id: 'mysore-masala-dosa',
    slug: 'mysore-masala-dosa',
    name: 'Mysore Masala Dosa',
    image: '/images/mysore-masala-dosa.png',
    price: 110,
    description: 'Spicy Mysore chutney spread with potato masala.',
    rating: 4.8,
    category: 'Dosa',
    emoji: '🌶️',
    glowColor: '#EF4444',
    glowSecondary: '#FCA5A5',
  },
  {
    id: 'ghee-roast-dosa',
    slug: 'ghee-roast-dosa',
    name: 'Ghee Roast Dosa',
    image: '/images/ghee-roast-dosa.png',
    price: 110,
    description: 'Aromatic ghee-roasted dosa — rich & flavourful.',
    rating: 4.9,
    category: 'Dosa',
    emoji: '🧈',
    glowColor: '#EAB308',
    glowSecondary: '#FEF08A',
  },
  {
    id: 'idli-4-pieces',
    slug: 'idli-4-pieces',
    name: 'Idli (4)',
    image: '/images/idli-4-pieces.png',
    price: 70,
    description: 'Soft, fluffy steamed rice cakes with chutney.',
    rating: 4.8,
    category: 'Breakfast',
    emoji: '🥥',
    glowColor: '#38BDF8',
    glowSecondary: '#BAE6FD',
  },
  {
    id: 'vada-4-pieces',
    slug: 'vada-4-pieces',
    name: 'Vada (4)',
    image: '/images/vada-4-pieces.png',
    price: 70,
    description: 'Crispy golden urad dal vadas — piping hot.',
    rating: 4.7,
    category: 'Breakfast',
    emoji: '🍩',
    glowColor: '#F97316',
    glowSecondary: '#FDBA74',
  },
  {
    id: 'chicken-biryani',
    slug: 'chicken-biryani',
    name: 'Chicken Biryani',
    image: '/images/chicken-biryani.png',
    price: 270,
    description: 'Aromatic layered biryani with tender chicken.',
    rating: 4.9,
    category: 'Biryani',
    badge: 'Popular',
    emoji: '🥘',
    extras: ['Egg', '2 Chicken Pieces', 'Onion Raita'],
    glowColor: '#DC2626',
    glowSecondary: '#FCA5A5',
  },
];

export const HERO_DEFAULT_INDEX = HERO_MENU_ITEMS.findIndex((i) => i.featured) ?? 1;

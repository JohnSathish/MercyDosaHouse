import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  ShoppingBag,
  ChefHat,
  Truck,
  Monitor,
  UtensilsCrossed,
  Layers,
  Package,
  Ticket,
  Users,
  Megaphone,
  BarChart3,
  Globe,
  Home,
  Tag,
  Image,
  MessageSquare,
  FileText,
  FolderOpen,
  Navigation,
  Bell,
  Palette,
  Search,
  FileBarChart,
  History,
  Shield,
  Sparkles,
  Settings,
  Smartphone,
  HelpCircle,
} from 'lucide-react';

export type AdminNavBadgeTone = 'count' | 'alert' | 'label';

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  badgeTone?: AdminNavBadgeTone;
  /** Live badge from dashboard stats */
  liveBadge?: 'pendingOrders';
}

export interface AdminNavGroup {
  title: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    title: 'Operations',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      {
        href: '/orders',
        label: 'Orders',
        icon: ShoppingBag,
        liveBadge: 'pendingOrders',
        badgeTone: 'count',
      },
      { href: '/alerts', label: 'Order Alerts', icon: Bell },
      { href: '/pos', label: 'POS', icon: Monitor },
      { href: '/menu', label: 'Menu Management', icon: UtensilsCrossed },
      { href: '/inventory', label: 'Inventory', icon: Package },
      { href: '/kitchen', label: 'KOT / Kitchen Display', icon: ChefHat },
      { href: '/customers', label: 'Customers', icon: Users },
      { href: '/delivery', label: 'Delivery Management', icon: Truck },
      { href: '/categories', label: 'Categories', icon: Layers },
      { href: '/offers-discounts', label: 'Offers & Discounts', icon: Ticket },
      { href: '/reports', label: 'Reports & Analytics', icon: FileBarChart },
      {
        href: '/marketing',
        label: 'Notifications',
        icon: Bell,
        badge: '2',
        badgeTone: 'alert',
      },
      { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Website & App',
    items: [
      { href: '/cms', label: 'Website Management', icon: Globe },
      { href: '/cms/homepage', label: 'Home Page', icon: Home },
      { href: '/cms/offers', label: 'Offers', icon: Tag },
      { href: '/cms/gallery', label: 'Gallery', icon: Image },
      { href: '/cms/testimonials', label: 'Testimonials', icon: MessageSquare },
      { href: '/cms/pages', label: 'Pages', icon: FileText },
      { href: '/cms/media', label: 'Media Library', icon: FolderOpen },
      { href: '/cms/navigation', label: 'Navigation', icon: Navigation },
      { href: '/cms/announcements', label: 'Announcements', icon: Megaphone },
      { href: '/marketing/popups', label: 'Popup Management', icon: Sparkles },
      { href: '/cms/theme', label: 'Theme Builder', icon: Palette },
      { href: '/cms/seo', label: 'SEO Manager', icon: Search },
      { href: '/cms/mobile', label: 'App Configuration', icon: Smartphone },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/activity', label: 'Activity Logs', icon: History },
      { href: '/roles', label: 'Staff Management', icon: Shield },
      { href: '/ai-assistant', label: 'AI Assistant', icon: Sparkles },
      { href: '/settings', label: 'Settings', icon: Settings },
      {
        href: 'mailto:info@mercydosahouse.com',
        label: 'Help & Support',
        icon: HelpCircle,
      },
    ],
  },
];

export const ADMIN_NAV = ADMIN_NAV_GROUPS.flatMap((g) => g.items);

export const QUICK_ACTIONS = [
  { href: '/menu', label: 'Add Menu Item', icon: UtensilsCrossed },
  { href: '/cms/offers', label: 'Create Offer', icon: Tag },
  { href: '/orders', label: 'View Orders', icon: ShoppingBag },
  { href: '/pos', label: 'Open POS', icon: Monitor },
] as const;

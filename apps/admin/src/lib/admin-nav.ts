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
} from 'lucide-react';

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
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
      { href: '/orders', label: 'Orders', icon: ShoppingBag },
      { href: '/kitchen', label: 'Kitchen Display', icon: ChefHat, badge: 'KDS' },
      { href: '/delivery', label: 'Delivery', icon: Truck, badge: 'DMS' },
      { href: '/pos', label: 'Restaurant POS', icon: Monitor, badge: 'POS' },
    ],
  },
  {
    title: 'Restaurant',
    items: [
      { href: '/menu', label: 'Menu Management', icon: UtensilsCrossed },
      { href: '/categories', label: 'Categories', icon: Layers, badge: 'CMS' },
      { href: '/inventory', label: 'Inventory', icon: Package },
      { href: '/coupons', label: 'Coupons', icon: Ticket },
    ],
  },
  {
    title: 'Customers & Growth',
    items: [
      { href: '/customers', label: 'Customers', icon: Users },
      { href: '/marketing', label: 'Announcements & Promotions', icon: Megaphone },
      { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Website Builder',
    items: [
      { href: '/cms', label: 'Website Overview', icon: Globe },
      { href: '/cms/homepage', label: 'Home Page', icon: Home },
      { href: '/cms/offers', label: 'Offers', icon: Tag },
      { href: '/cms/gallery', label: 'Gallery', icon: Image },
      { href: '/cms/testimonials', label: 'Testimonials', icon: MessageSquare },
      { href: '/cms/pages', label: 'Pages', icon: FileText },
      { href: '/cms/media', label: 'Media Library', icon: FolderOpen },
      { href: '/cms/navigation', label: 'Navigation', icon: Navigation },
      { href: '/cms/announcements', label: 'Announcements', icon: Bell },
      { href: '/cms/theme', label: 'Theme Builder', icon: Palette },
      { href: '/cms/seo', label: 'SEO Manager', icon: Search },
      { href: '/cms/mobile', label: 'Mobile App', icon: Smartphone, badge: 'App' },
    ],
  },
  {
    title: 'Reports & System',
    items: [
      { href: '/reports', label: 'Reports', icon: FileBarChart, badge: 'BI' },
      { href: '/activity', label: 'Activity Logs', icon: History, badge: 'Audit' },
      { href: '/roles', label: 'Roles & Permissions', icon: Shield },
      { href: '/ai-assistant', label: 'AI Assistant', icon: Sparkles, badge: 'AI' },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export const ADMIN_NAV = ADMIN_NAV_GROUPS.flatMap((g) => g.items);

export const QUICK_ACTIONS = [
  { href: '/menu', label: 'Add Menu Item', icon: UtensilsCrossed },
  { href: '/cms/offers', label: 'Create Offer', icon: Tag },
  { href: '/orders', label: 'View Orders', icon: ShoppingBag },
] as const;

export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'ARCHIVED';

export interface CmsSectionDto {
  id: string;
  pageKey: string;
  sectionKey: string;
  title?: string | null;
  content: Record<string, unknown>;
  sortOrder: number;
  isEnabled: boolean;
  status: ContentStatus;
  publishedAt?: string | null;
  scheduledAt?: string | null;
}

export interface CmsPageDto {
  id: string;
  slug: string;
  title: string;
  content?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  ogImage?: string | null;
  status: ContentStatus;
  publishedAt?: string | null;
}

export interface GalleryItemDto {
  id: string;
  title?: string | null;
  imageUrl: string;
  album: string;
  sortOrder: number;
  isFeatured: boolean;
  isActive: boolean;
}

export interface OfferDto {
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  discountPct?: number | null;
  type: string;
  buttonLabel?: string | null;
  buttonUrl?: string | null;
  displayPosition?: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface TestimonialDto {
  id: string;
  customerName: string;
  photoUrl?: string | null;
  rating: number;
  comment: string;
  isPublished: boolean;
  isPinned: boolean;
  sortOrder: number;
}

export interface FaqDto {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isPublished: boolean;
}

export interface AnnouncementDto {
  id: string;
  title: string;
  message: string;
  type: 'BAR' | 'POPUP';
  linkUrl?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
}

export interface NavigationItemDto {
  id: string;
  menuKey: string;
  label: string;
  href: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ThemeSettingsDto {
  id: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  borderRadius: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  darkMode: boolean;
}

export interface SeoMetadataDto {
  id: string;
  pageKey: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  keywords?: string | null;
  ogImage?: string | null;
  canonicalUrl?: string | null;
}

export interface MediaAssetDto {
  id: string;
  filename: string;
  url: string;
  altText?: string | null;
  mimeType: string;
  size: number;
  folder: string;
  createdAt: string;
}

export interface PublishedSiteContentDto {
  sections: CmsSectionDto[];
  pages: CmsPageDto[];
  gallery: GalleryItemDto[];
  testimonials: TestimonialDto[];
  faqs: FaqDto[];
  announcements: AnnouncementDto[];
  navigation: NavigationItemDto[];
  theme: ThemeSettingsDto;
  seo: SeoMetadataDto[];
  offers: OfferDto[];
}

export interface HeroSectionContent {
  badge?: string;
  title?: string;
  subtitle?: string;
  ctaPrimary?: { label: string; href: string };
  ctaSecondary?: { label: string; href: string };
  stats?: { value: number; suffix?: string; prefix?: string; label: string }[];
}

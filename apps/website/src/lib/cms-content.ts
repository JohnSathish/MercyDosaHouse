import { api } from '@/lib/api';
import type { PublishedSiteContentDto, CmsSectionDto, HeroSectionContent } from '@mdh/types';

const FALLBACK: PublishedSiteContentDto = {
  sections: [],
  pages: [],
  gallery: [],
  testimonials: [],
  faqs: [],
  announcements: [],
  navigation: [],
  theme: {
    id: '',
    primaryColor: '#14532D',
    secondaryColor: '#F59E0B',
    fontFamily: 'Poppins',
    borderRadius: '1rem',
    darkMode: false,
  },
  seo: [],
  offers: [],
};

let cache: { data: PublishedSiteContentDto; expires: number } | null = null;

export async function getPublishedSiteContent(): Promise<PublishedSiteContentDto> {
  if (cache && cache.expires > Date.now()) return cache.data;
  try {
    const data = await api.get<PublishedSiteContentDto>('/cms/published');
    cache = { data, expires: Date.now() + 60_000 };
    return data;
  } catch {
    return FALLBACK;
  }
}

export function getSectionContent<T = Record<string, unknown>>(
  content: PublishedSiteContentDto,
  pageKey: string,
  sectionKey: string,
): T | null {
  const section = content.sections.find(
    (s: CmsSectionDto) => s.pageKey === pageKey && s.sectionKey === sectionKey && s.isEnabled,
  );
  return (section?.content as T) ?? null;
}

export function getHeroContent(content: PublishedSiteContentDto): HeroSectionContent | null {
  return getSectionContent<HeroSectionContent>(content, 'home', 'hero');
}

export function revalidateCmsCache() {
  cache = null;
}

import { api } from '@/lib/api';
import type { BusinessSettingsDto } from '@mdh/types';
import { buildPageMetadata } from '@/lib/seo';
import { LocalSeoArticle } from '@/components/seo/local-seo-article';

async function loadSettings() {
  try {
    return await api.get<BusinessSettingsDto>('/settings/business');
  } catch {
    return null;
  }
}

export const generateMetadata = () => buildPageMetadata('idli-tura', '/idli-tura');

export default async function Page() {
  const settings = await loadSettings();
  return <LocalSeoArticle slug="idli-tura" settings={settings} />;
}

/** Canonical English labels for known menu category slugs. */
export const CANONICAL_MENU_CATEGORY_NAMES: Record<string, string> = {
  dosa: 'Dosa',
  idly: 'Idly',
  vada: 'Vada',
  biryani: 'Biryani',
  rice: 'Rice',
  meals: 'Meals',
  beverages: 'Beverages',
  combos: 'Combos',
};

/** Random lowercase tokens (e.g. "onaovj") are not real menu labels. */
export function isGarbledCategoryName(name: string, slug: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;
  const canonical = CANONICAL_MENU_CATEGORY_NAMES[slug];
  if (canonical && trimmed.toLowerCase() === canonical.toLowerCase()) return false;
  if (trimmed.toLowerCase() === slug) return false;
  return /^[a-z]{4,12}$/.test(trimmed);
}

export function displayCategoryName(name: string | null | undefined, slug: string): string {
  const canonical = CANONICAL_MENU_CATEGORY_NAMES[slug];
  const trimmed = (name ?? '').trim();
  if (
    canonical &&
    (isGarbledCategoryName(trimmed, slug) || !trimmed || trimmed.toLowerCase() === slug)
  ) {
    return canonical;
  }
  return trimmed || slug;
}

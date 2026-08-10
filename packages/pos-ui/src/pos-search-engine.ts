import type { PosMenuProductDto } from '@mdh/types';

export interface PosSearchIndexEntry {
  product: PosMenuProductDto;
  normalizedName: string;
  normalizedSlug: string;
  normalizedCategory: string;
  compactName: string;
  tokens: string[];
}

export interface PosSearchRankOptions {
  recentIds?: string[];
  topIds?: string[];
  limit?: number;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compact(s: string): string {
  return normalize(s).replace(/\s/g, '');
}

/** Subsequence fuzzy match — "chese" matches "cheese", "mysor" matches "mysore". */
function fuzzySubsequence(query: string, target: string): number {
  if (!query || !target) return 0;
  let qi = 0;
  let consecutive = 0;
  let bestRun = 0;
  for (let ti = 0; ti < target.length && qi < query.length; ti++) {
    if (target[ti] === query[qi]) {
      qi++;
      consecutive++;
      bestRun = Math.max(bestRun, consecutive);
    } else {
      consecutive = 0;
    }
  }
  if (qi < query.length) return 0;
  return Math.round(40 + (bestRun / query.length) * 60);
}

function scoreEntry(entry: PosSearchIndexEntry, query: string, opts: PosSearchRankOptions): number {
  const q = normalize(query);
  const qc = compact(query);
  if (!q) return 0;

  let score = 0;
  const { normalizedName, normalizedSlug, normalizedCategory, compactName, tokens } = entry;

  if (normalizedName === q) score = 1000;
  else if (normalizedName.startsWith(q)) score = 850;
  else if (tokens.some((t) => t.startsWith(q))) score = 750;
  else if (normalizedName.includes(q)) score = 550;
  else if (normalizedSlug.includes(q)) score = 450;
  else if (normalizedCategory.includes(q)) score = 350;
  else {
    const fuzzyName = fuzzySubsequence(q, normalizedName);
    const fuzzyCompact = fuzzySubsequence(qc, compactName);
    score = Math.max(fuzzyName, fuzzyCompact);
  }

  if (score <= 0) return 0;

  if (entry.product.isPopular) score += 50;

  const topIdx = opts.topIds?.indexOf(entry.product.id) ?? -1;
  if (topIdx >= 0) score += 120 - topIdx * 8;

  const recentIdx = opts.recentIds?.indexOf(entry.product.id) ?? -1;
  if (recentIdx >= 0) score += 90 - recentIdx * 5;

  if (!entry.product.isAvailable) score -= 200;

  return score;
}

export function buildSearchIndex(products: PosMenuProductDto[]): PosSearchIndexEntry[] {
  return products.map((product) => {
    const normalizedName = normalize(product.name);
    return {
      product,
      normalizedName,
      normalizedSlug: normalize(product.slug),
      normalizedCategory: normalize(product.categoryName),
      compactName: compact(product.name),
      tokens: normalizedName.split(' ').filter(Boolean),
    };
  });
}

export function searchMenuProducts(
  index: PosSearchIndexEntry[],
  query: string,
  options: PosSearchRankOptions = {},
): PosMenuProductDto[] {
  const q = query.trim();
  if (!q) return [];

  const limit = options.limit ?? 10;
  const scored = index
    .map((entry) => ({ entry, score: scoreEntry(entry, q, options) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.product.name.localeCompare(b.entry.product.name));

  const seen = new Set<string>();
  const results: PosMenuProductDto[] = [];
  for (const { entry } of scored) {
    if (seen.has(entry.product.id)) continue;
    seen.add(entry.product.id);
    results.push(entry.product);
    if (results.length >= limit) break;
  }
  return results;
}

export function resolveSuggestedProducts(
  products: PosMenuProductDto[],
  recentIds: string[],
  topIds: string[],
): { recent: PosMenuProductDto[]; top: PosMenuProductDto[] } {
  const map = new Map(products.map((p) => [p.id, p]));
  const recent = recentIds
    .map((id) => map.get(id))
    .filter((p): p is PosMenuProductDto => !!p)
    .slice(0, 6);
  const top = topIds
    .map((id) => map.get(id))
    .filter((p): p is PosMenuProductDto => !!p)
    .slice(0, 6);
  return { recent, top };
}

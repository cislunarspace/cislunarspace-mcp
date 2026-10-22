import type { Dictionary, DictEntry, FlatEntry, SearchHit } from './types.js';

const SITE_ORIGIN = 'https://cislunarspace.cn';
const EXCERPT_LENGTH = 120;

/** 词条页面路径：优先用工件给的 url，缺省按分类与 slug 推导。 */
export function entryPath(categorySlug: string, entry: DictEntry): string {
  if (entry.url) return entry.url;
  return `/glossary/${categorySlug}/${entry.slug}/`;
}

export function entryAbsoluteUrl(categorySlug: string, entry: DictEntry): string {
  return `${SITE_ORIGIN}${entryPath(categorySlug, entry)}`;
}

/** 把工件里的嵌套结构摊平成可检索的条目列表。 */
export function flattenDictionary(dict: Dictionary): FlatEntry[] {
  const out: FlatEntry[] = [];
  for (const category of dict.categories) {
    for (const entry of category.entries) {
      out.push({
        ...entry,
        category: category.slug,
        categoryLabel: category.label,
        url: entryAbsoluteUrl(category.slug, entry),
      });
    }
  }
  return out;
}

/** 去掉引用标记与公式定界符，保留可朗读的正文。 */
export function plainDefinition(text: string): string {
  return text
    .replace(/\\cite\{[^}]*\}/g, '')
    .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
    .replace(/\$([^$]*)\$/g, '$1')
    .replace(/\s+/g, ' ')
    .replace(/\s+([，。、；：）])/g, '$1')
    .trim();
}

/** 提取引用键，多键引用按逗号拆开。 */
export function extractCitationKeys(text: string): string[] {
  const keys: string[] = [];
  for (const m of text.matchAll(/\\cite\{([^}]+)\}/g)) {
    for (const raw of m[1].split(',')) {
      const key = raw.trim();
      if (key && !keys.includes(key)) keys.push(key);
    }
  }
  return keys;
}

function tokensOf(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function hits(haystack: string | null | undefined, needle: string): boolean {
  return typeof haystack === 'string' && haystack.toLowerCase().includes(needle);
}

function scoreToken(entry: FlatEntry, token: string): number {
  const title = entry.title.toLowerCase();
  const other = entry.otherTitle?.toLowerCase();
  const slug = entry.slug.toLowerCase();

  if (title === token) return 100;
  if (title.includes(token)) return 60;
  if (other === token) return 55;
  if (other?.includes(token)) return 45;
  if (entry.keywords?.some((k) => k.toLowerCase() === token)) return 50;
  if (entry.aliases?.some((a) => a.toLowerCase() === token)) return 50;
  if (entry.keywords?.some((k) => k.toLowerCase().includes(token))) return 35;
  if (entry.aliases?.some((a) => a.toLowerCase().includes(token))) return 35;
  if (slug === token) return 40;
  if (slug.includes(token)) return 20;
  if (hits(entry.definition, token)) return 15;
  if (hits(entry.categoryLabel, token)) return 5;
  return 0;
}

/** 分层打分：每个词元取最高字段分，任一字段都不命中则该条出局。 */
export function scoreEntry(entry: FlatEntry, query: string): number {
  const tokens = tokensOf(query);
  if (tokens.length === 0) return 0;
  let total = 0;
  for (const token of tokens) {
    const score = scoreToken(entry, token);
    if (score === 0) return 0;
    total += score;
  }
  return total;
}

export function excerptOf(entry: FlatEntry, length = EXCERPT_LENGTH): string {
  const text = plainDefinition(entry.definition ?? '');
  if (text.length <= length) return text;
  return `${text.slice(0, length)}…`;
}

export function searchEntries(entries: FlatEntry[], query: string, limit = 5): SearchHit[] {
  const scored: SearchHit[] = [];
  for (const entry of entries) {
    const score = scoreEntry(entry, query);
    if (score === 0) continue;
    scored.push({ entry, score, excerpt: excerptOf(entry) });
  }
  scored.sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title, 'zh'));
  return scored.slice(0, Math.max(1, limit));
}

export function findEntry(entries: FlatEntry[], slug: string, category?: string): FlatEntry | null {
  const trimmed = slug.trim();
  const slash = trimmed.indexOf('/');
  let cat = category?.trim();
  let name = trimmed;
  if (slash > 0) {
    cat = trimmed.slice(0, slash);
    name = trimmed.slice(slash + 1);
  }

  const bySlug = entries.filter((e) => e.slug === name);
  if (cat) {
    return bySlug.find((e) => e.category === cat) ?? null;
  }
  if (bySlug.length === 1) return bySlug[0];
  return bySlug[0] ?? null;
}

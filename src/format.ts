import { extractCitationKeys, plainDefinition } from './dictionary.js';
import type { FlatEntry, SearchHit } from './types.js';

export type Bibliography = Record<string, { number?: number; formatted?: string }>;
export interface BibliographyArtifact {
  entries: Bibliography;
}

export function bibliographyEntries(artifact: BibliographyArtifact): Bibliography {
  if (!artifact || typeof artifact.entries !== 'object' || artifact.entries === null) {
    throw new Error('题录工件缺少 entries 映射');
  }
  return artifact.entries;
}

export function formatSearchText(query: string, hits: SearchHit[]): string {
  if (hits.length === 0) {
    return `没有匹配“${query}”的词条。可以换更短的关键词，或用 get 按分类与 slug 直接取。`;
  }
  return hits
    .map((hit, index) => {
      const { entry, excerpt } = hit;
      const lines = [`${index + 1}. ${entry.title}`];
      if (entry.otherTitle) lines.push(`   英文名：${entry.otherTitle}`);
      lines.push(`   分类：${entry.categoryLabel}`);
      lines.push(`   链接：${entry.url}`);
      lines.push(`   定义：${excerpt || '（无定义）'}`);
      return lines.join('\n');
    })
    .join('\n\n');
}

export function citationLines(entry: FlatEntry, bibliography: Bibliography | null): string[] {
  const keys =
    entry.citations && entry.citations.length > 0
      ? entry.citations
      : extractCitationKeys(entry.definition ?? '');
  return keys.map((key) => {
    const formatted = bibliography?.[key]?.formatted?.replace(/^\.\s*/, '').trim();
    return formatted ? `- ${formatted}` : `- ${key}`;
  });
}

export function formatEntryText(entry: FlatEntry, bibliography: Bibliography | null = null): string {
  const lines = [`标题：${entry.title}`];
  if (entry.otherTitle) lines.push(`英文名：${entry.otherTitle}`);
  lines.push(`分类：${entry.categoryLabel}（${entry.category}）`);
  lines.push(`链接：${entry.url}`);
  if (entry.keywords?.length) lines.push(`关键词：${entry.keywords.join('、')}`);
  if (entry.aliases?.length) lines.push(`别名：${entry.aliases.join('、')}`);
  lines.push('', '定义：', plainDefinition(entry.definition ?? '') || '（无定义）');
  const cites = citationLines(entry, bibliography);
  if (cites.length > 0) lines.push('', '参考文献：', ...cites);
  return lines.join('\n');
}

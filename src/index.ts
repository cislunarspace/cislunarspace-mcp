#!/usr/bin/env node
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { defaultCacheDir, loadJsonWithCache } from './cache.js';
import { extractCitationKeys, findEntry, flattenDictionary, searchEntries } from './dictionary.js';
import {
  bibliographyEntries,
  formatEntryText,
  formatSearchText,
  type Bibliography,
  type BibliographyArtifact,
} from './format.js';
import type { Dictionary, FlatEntry } from './types.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

const DEFAULT_DICTIONARY_URL = 'https://cislunarspace.cn/glossary-dictionary.json';
const DEFAULT_BIBLIOGRAPHY_URL = 'https://cislunarspace.cn/bibliography.json';

const dictionaryUrl = process.env.CISLUNAR_DICTIONARY_URL || DEFAULT_DICTIONARY_URL;
const bibliographyUrl = process.env.CISLUNAR_BIBLIOGRAPHY_URL || DEFAULT_BIBLIOGRAPHY_URL;
const cacheDir = process.env.CISLUNAR_CACHE_DIR || defaultCacheDir();

let bibliography: Bibliography | null = null;

async function loadBibliography(): Promise<Bibliography | null> {
  if (bibliography) return bibliography;
  try {
    const loaded = await loadJsonWithCache<BibliographyArtifact>({
      url: bibliographyUrl,
      cacheFile: join(cacheDir, 'bibliography.json'),
    });
    bibliography = bibliographyEntries(loaded.data);
  } catch (err) {
    console.error(`[cislunarspace-mcp] 题录加载失败，退回引用键：${(err as Error).message}`);
  }
  return bibliography;
}

async function main(): Promise<void> {
  const loaded = await loadJsonWithCache<Dictionary>({
    url: dictionaryUrl,
    cacheFile: join(cacheDir, 'glossary-dictionary.json'),
  });
  const entries: FlatEntry[] = flattenDictionary(loaded.data);
  console.error(`[cislunarspace-mcp] 词典已加载：${entries.length} 条，来源 ${loaded.source}`);

  const server = new McpServer({ name: 'cislunarspace-mcp', version });

  server.registerTool(
    'search',
    {
      title: '检索地月空间术语',
      description:
        '按关键词检索地月空间入门指南的术语词典，返回词条标题、英文名、分类、页面链接与定义摘要。适合回答“什么是 X”这类问题。',
      inputSchema: {
        query: z.string().min(1).describe('检索词，中文或英文均可，例如 晕轨道、NRHO、Halo Orbit'),
        limit: z.number().int().min(1).max(20).optional().describe('返回条数，默认 5'),
      },
    },
    async ({ query, limit }) => {
      const hits = searchEntries(entries, query, limit ?? 5);
      return { content: [{ type: 'text' as const, text: formatSearchText(query, hits) }] };
    },
  );

  server.registerTool(
    'get',
    {
      title: '取单条词条全文',
      description:
        '按分类与 slug 取一条词条的完整定义与参考文献。slug 可写成 分类/slug 形式，例如 orbits/aro。',
      inputSchema: {
        slug: z.string().min(1).describe('词条 slug，例如 aro 或 orbits/aro'),
        category: z.string().optional().describe('分类 slug，例如 orbits。slug 已含分类时可省略'),
      },
    },
    async ({ slug, category }) => {
      const entry = findEntry(entries, slug, category);
      if (!entry) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `没有找到词条 ${slug}。可先用 search 定位。` }],
        };
      }
      const needsBibliography =
        (entry.citations?.length ?? 0) > 0 ||
        extractCitationKeys(entry.definition ?? '').length > 0;
      const bib = needsBibliography ? await loadBibliography() : null;
      return { content: [{ type: 'text' as const, text: formatEntryText(entry, bib) }] };
    },
  );

  await server.connect(new StdioServerTransport());
  console.error('[cislunarspace-mcp] 已就绪，等待 stdio 请求');
}

main().catch((err: unknown) => {
  console.error(`[cislunarspace-mcp] 启动失败：${(err as Error).message}`);
  process.exit(1);
});

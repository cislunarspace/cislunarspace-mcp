import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

export function defaultCacheDir(): string {
  const base = process.env.XDG_CACHE_HOME || join(homedir(), '.cache');
  return join(base, 'cislunarspace-mcp');
}

export interface LoadOptions {
  url: string;
  cacheFile: string;
  fetchImpl?: typeof fetch;
}

export interface LoadResult<T> {
  data: T;
  source: 'network' | 'cache';
}

async function readIfExists(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return null;
  }
}

/**
 * 条件请求加本地缓存。数据没变时服务端回 304，直接复用缓存文件。
 * 网络失败时退回缓存，只有从未成功拉取过才会抛错。
 */
export async function loadJsonWithCache<T>(options: LoadOptions): Promise<LoadResult<T>> {
  const { url, cacheFile } = options;
  const doFetch = options.fetchImpl ?? fetch;
  const etagFile = `${cacheFile}.etag`;

  const cachedBody = await readIfExists(cacheFile);
  const cachedEtag = await readIfExists(etagFile);

  try {
    const headers: Record<string, string> = {};
    if (cachedEtag) headers['if-none-match'] = cachedEtag.trim();

    const res = await doFetch(url, { headers });
    if (res.status === 304 && cachedBody) {
      return { data: JSON.parse(cachedBody) as T, source: 'cache' };
    }
    if (!res.ok) throw new Error(`拉取失败：HTTP ${res.status} ${url}`);

    const text = await res.text();
    const data = JSON.parse(text) as T;

    await mkdir(dirname(cacheFile), { recursive: true });
    const tmp = `${cacheFile}.tmp`;
    await writeFile(tmp, text, 'utf8');
    await rename(tmp, cacheFile);

    const etag = res.headers.get('etag');
    if (etag) await writeFile(etagFile, etag, 'utf8');

    return { data, source: 'network' };
  } catch (err) {
    if (cachedBody) return { data: JSON.parse(cachedBody) as T, source: 'cache' };
    throw err;
  }
}

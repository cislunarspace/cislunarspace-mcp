/**
 * 联网冒烟：拉一次线上词典，跑几条检索，打印命中结果。
 * 需要网络，不进入 CI。用法：npm run smoke
 */
import { loadJsonWithCache, defaultCacheDir } from '../dist/cache.js';
import { flattenDictionary, searchEntries, findEntry } from '../dist/dictionary.js';
import { formatSearchText, formatEntryText } from '../dist/format.js';
import { join } from 'node:path';

const url = process.env.CISLUNAR_DICTIONARY_URL || 'https://cislunarspace.cn/glossary-dictionary.json';
const cacheDir = process.env.CISLUNAR_CACHE_DIR || defaultCacheDir();

const loaded = await loadJsonWithCache({
  url,
  cacheFile: join(cacheDir, 'glossary-dictionary.json'),
});
const entries = flattenDictionary(loaded.data);
console.log(`词典 ${entries.length} 条，来源 ${loaded.source}`);

for (const query of ['晕轨道', 'NRHO', 'halo orbit', '平动点', '弱稳定边界']) {
  const hits = searchEntries(entries, query, 2);
  console.log(`\n=== ${query}`);
  console.log(formatSearchText(query, hits));
}

console.log('\n=== get orbits/aro');
const aro = findEntry(entries, 'orbits/aro');
console.log(aro ? formatEntryText(aro, null) : '未找到 orbits/aro');

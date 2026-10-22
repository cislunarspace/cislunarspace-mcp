import test from 'node:test';
import assert from 'node:assert/strict';

import {
  entryAbsoluteUrl,
  extractCitationKeys,
  findEntry,
  flattenDictionary,
  plainDefinition,
  searchEntries,
} from '../dist/dictionary.js';
import { formatEntryText, formatSearchText } from '../dist/format.js';

const dictionary = {
  categories: [
    {
      slug: 'orbits',
      label: '任务轨道',
      entries: [
        {
          slug: 'aro',
          title: '轴向共振轨道（Axial Resonant Orbit, ARO）',
          otherTitle: 'Axial Resonant Orbit, ARO',
          definition: '三维共振轨道的一种，关于 x 轴对称 \\cite{vaquero2014,sims1997}。',
          keywords: ['轴向共振', 'ARO'],
        },
        {
          slug: 'halo-orbit',
          title: '晕轨道（Halo Orbit）',
          otherTitle: 'Halo Orbit',
          definition: '平动点附近的周期轨道，$L_1$ 与 $L_2$ 附近常见。',
          keywords: ['Halo Orbit', 'NRHO'],
          url: '/glossary/orbits/halo-orbit/',
        },
      ],
    },
    {
      slug: 'fundamentals',
      label: '基础概念',
      entries: [
        {
          slug: 'aro',
          title: '轴向比',
          otherTitle: null,
          definition: '另一个分类里的同名 slug，定义不同。',
        },
      ],
    },
  ],
};

const entries = flattenDictionary(dictionary);

test('flatten 生成绝对链接，缺省按分类与 slug 推导', () => {
  const aro = entries.find((e) => e.category === 'orbits' && e.slug === 'aro');
  assert.equal(aro.url, 'https://cislunarspace.cn/glossary/orbits/aro/');
  const halo = entries.find((e) => e.slug === 'halo-orbit');
  assert.equal(halo.url, 'https://cislunarspace.cn/glossary/orbits/halo-orbit/');
  assert.equal(entryAbsoluteUrl('x', { slug: 'y', title: 'Y' }), 'https://cislunarspace.cn/glossary/x/y/');
});

test('plainDefinition 去掉引用标记与公式定界符', () => {
  assert.equal(
    plainDefinition('平动点附近的周期轨道，$L_1$ 与 $L_2$ 附近常见。'),
    '平动点附近的周期轨道，L_1 与 L_2 附近常见。',
  );
  assert.equal(plainDefinition('三维共振轨道的一种 \\cite{a,b}。'), '三维共振轨道的一种。');
});

test('extractCitationKeys 拆分多键引用并去重', () => {
  assert.deepEqual(extractCitationKeys('x \\cite{a,b} y \\cite{b,c}'), ['a', 'b', 'c']);
  assert.deepEqual(extractCitationKeys('无引用'), []);
});

test('search 中文标题精确命中排第一', () => {
  const hits = searchEntries(entries, '晕轨道');
  assert.equal(hits[0].entry.slug, 'halo-orbit');
});

test('search 英文名与关键词都能命中', () => {
  assert.equal(searchEntries(entries, 'halo orbit')[0].entry.slug, 'halo-orbit');
  assert.equal(searchEntries(entries, 'NRHO')[0].entry.slug, 'halo-orbit');
  assert.equal(searchEntries(entries, 'ARO')[0].entry.slug, 'aro');
});

test('search 多词元要求全部命中', () => {
  assert.equal(searchEntries(entries, '晕轨道 nrho').length, 1);
  assert.equal(searchEntries(entries, '晕轨道 sims1997').length, 0);
});

test('search 尊重 limit 且无匹配返回空数组', () => {
  assert.equal(searchEntries(entries, '轨道', 1).length, 1);
  assert.deepEqual(searchEntries(entries, '不存在的词'), []);
});

test('同名 slug 按分类区分', () => {
  const orbitsAro = findEntry(entries, 'aro', 'orbits');
  const fundamentalsAro = findEntry(entries, 'aro', 'fundamentals');
  assert.equal(orbitsAro.title, '轴向共振轨道（Axial Resonant Orbit, ARO）');
  assert.equal(fundamentalsAro.title, '轴向比');
  assert.equal(findEntry(entries, 'orbits/aro').category, 'orbits');
  assert.equal(findEntry(entries, '不存在/aro'), null);
});

test('formatSearchText 输出标题、分类与链接', () => {
  const text = formatSearchText('晕轨道', searchEntries(entries, '晕轨道'));
  assert.match(text, /晕轨道（Halo Orbit）/);
  assert.match(text, /分类：任务轨道/);
  assert.match(text, /https:\/\/cislunarspace\.cn\/glossary\/orbits\/halo-orbit\//);
  assert.match(formatSearchText('无', []), /没有匹配/);
});

test('formatEntryText 在键缺题录时输出引用键', () => {
  const aro = findEntry(entries, 'orbits/aro');
  const text = formatEntryText(aro, null);
  assert.match(text, /参考文献：/);
  assert.match(text, /- vaquero2014/);
  const withBib = formatEntryText(aro, {
    vaquero2014: { number: 1, formatted: '. 某篇文献[M]. 某出版社, 2014.' },
  });
  assert.match(withBib, /某篇文献/);
});

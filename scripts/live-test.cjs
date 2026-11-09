const assert = require('node:assert/strict');
const fs = require('node:fs');
const loadPlugin = require('./load-plugin.cjs');
const plugin = loadPlugin((url, init) =>
  fetch(url, { ...init, signal: AbortSignal.timeout(30000) }),
);
(async () => {
  const report = { timestamp: new Date().toISOString(), checks: [] };
  const page1 = await plugin.popularNovels(1, {});
  const page2 = await plugin.popularNovels(2, {});
  assert(page1.length > 0);
  assert(page1.every(n => n.path.startsWith('/novel/')));
  assert(page2.every(n => !page1.some(p => p.path === n.path)));
  report.checks.push({
    name: 'catalogue and pagination',
    page1: page1.length,
    page2: page2.length,
  });
  const latest = await plugin.popularNovels(1, { showLatestNovels: true });
  assert(latest.length > 0);
  const results = await plugin.searchNovels('Shadow Slave', 1);
  assert(results.some(n => n.path === '/novel/shadow-slave'));
  assert.equal(
    (await plugin.searchNovels('zzzznonexistentnovel987654321', 1)).length,
    0,
  );
  const novel = await plugin.parseNovel('/novel/shadow-slave');
  assert(novel.chapters.length > 0);
  assert.equal(
    new Set(novel.chapters.map(c => c.path)).size,
    novel.chapters.length,
  );
  assert(
    novel.chapters.every(
      (c, i, chapters) =>
        i === 0 || c.chapterNumber >= chapters[i - 1].chapterNumber,
    ),
  );
  report.checks.push({
    name: 'search, latest, metadata, ordering',
    chapters: novel.chapters.length,
  });
  for (const number of [0, 1, 2]) {
    const chapter = novel.chapters.find(c => c.chapterNumber === number);
    assert(chapter);
    const html = await plugin.parseChapter(chapter.path);
    assert(html.length > 200);
    assert(!/<script|<iframe|\bonclick=/i.test(html));
    report.checks.push({
      name: 'Shadow Slave chapter ' + number,
      characters: html.length,
    });
  }
  fs.writeFileSync('test-report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

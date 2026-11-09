const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const loadPlugin = require('./load-plugin.cjs');
const response = data => ({ ok: true, status: 200, json: async () => data });
test('empty searches and pages accept the API null-list response', async () => {
  const plugin = loadPlugin(async () =>
    response({ data: null, total: 0, pages: 0 }),
  );
  assert.equal((await plugin.searchNovels('missing', 1)).length, 0);
  const end = loadPlugin(async () =>
    response({ data: null, total: 32, pages: 2 }),
  );
  assert.equal((await end.popularNovels(3, {})).length, 0);
  const invalid = loadPlugin(async () =>
    response({ data: null, total: 32, pages: 2 }),
  );
  await assert.rejects(invalid.popularNovels(1, {}), /Catálogo/);
});
// Independent encoder provides UTF-8 fixtures for every public codec key/version.
function encode(data, index, version) {
  const key = crypto
    .createHash('sha256')
    .update(`_orion_key_${index}_v2_OrionNexus2025CryptoKey!Secure`)
    .digest();
  const box = Array.from({ length: 256 }, (_, i) => i);
  let offset = 0;
  for (let i = 0; i < 256; i++) {
    offset = (offset + box[i] + key[i % 32]) % 256;
    [box[i], box[offset]] = [box[offset], box[i]];
  }
  const bytes = Buffer.from(JSON.stringify(data));
  const out = Buffer.alloc(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    const rotation = (((key[(i + 3) % 32] + (i & 255)) & 255) % 7) + 1;
    const value = bytes[i] ^ key[i % 32];
    out[i] =
      box[((value << rotation) | (value >>> (8 - rotation))) & 255] ^
      (i ? out[i - 1] : key[31]);
  }
  return { d: out.toString('base64'), k: index, v: version };
}
test('public codec handles every key and UTF-8 without browser/Node globals', async () => {
  for (const [index, version] of [
    [0, 1],
    [0, 2],
    [1, 2],
    [2, 2],
    [3, 2],
    [4, 2],
  ]) {
    const plugin = loadPlugin(async () =>
      response(
        encode(
          {
            contentType: 'text',
            textContent: '<p>Ação — 中文 🌙</p>',
            accessLevel: 'public',
          },
          index,
          version,
        ),
      ),
    );
    assert.match(await plugin.parseChapter('/ler/test/1'), /Ação — 中文 🌙/);
  }
});
test('catalogue excludes manga and encodes searches', async () => {
  let url;
  const plugin = loadPlugin(async request => {
    url = request;
    return response({
      data: [
        { type: 'manga', title: 'No', slug: 'no' },
        { type: 'novel', title: 'Yes', slug: 'yes' },
      ],
      pages: 1,
    });
  });
  const novels = await plugin.searchNovels('ação & teste', 1);
  assert.equal(novels.length, 1);
  assert.equal(novels[0].name, 'Yes');
  assert(url.includes(encodeURIComponent('ação & teste')));
  assert.equal((await plugin.popularNovels(2, {})).length, 0);
});
test('chapter markup retains text and removes executable content', async () => {
  const plugin = loadPlugin(async () =>
    response({
      contentType: 'text',
      textContent:
        '<p style="color:black" onclick="bad()">Olá <em>mundo</em></p><script>bad()</script><iframe src="bad"></iframe><a href="javascript:bad()">nota</a>',
    }),
  );
  const html = await plugin.parseChapter('/ler/test/1');
  assert.match(html, /Olá <em>mundo<\/em>/);
  assert(!/script|iframe|onclick|style=|javascript:/i.test(html));
});
test('restrictions, empty bodies, image chapters and HTTP errors are explicit', async () => {
  for (const body of [
    { requiresSession: true },
    { accessLevel: 'vip' },
    { contentType: 'image' },
    { contentType: 'text', textContent: ' ' },
  ]) {
    await assert.rejects(
      loadPlugin(async () => response(body)).parseChapter('/ler/test/1'),
    );
  }
  await assert.rejects(
    loadPlugin(async () => ({ ok: false, status: 403 })).parseChapter(
      '/ler/test/1',
    ),
    /HTTP 403/,
  );
});

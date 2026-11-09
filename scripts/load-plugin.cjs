const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const cheerio = require('cheerio');

module.exports = function loadPlugin(fetchApi = fetch) {
  const code = fs.readFileSync(
    path.join(__dirname, '../dist/nexustoons.js'),
    'utf8',
  );
  const exports = {};
  const libs = {
    '@libs/fetch': { fetchApi },
    '@libs/defaultCover': { defaultCover: 'https://example.org/default.png' },
    '@libs/novelStatus': {
      NovelStatus: {
        Ongoing: 'Ongoing',
        Completed: 'Completed',
        OnHiatus: 'On Hiatus',
        Cancelled: 'Cancelled',
        Unknown: 'Unknown',
      },
    },
    cheerio,
  };
  // Deliberately no Buffer, atob, TextDecoder, Node require or browser globals.
  vm.runInNewContext(code, {
    exports,
    module: { exports },
    require: name => {
      if (!libs[name]) throw new Error('Unsupported runtime import: ' + name);
      return libs[name];
    },
  });
  return exports.default;
};

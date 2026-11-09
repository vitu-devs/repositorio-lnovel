const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(
  path.join(__dirname, 'fixtures/lnreader-tts-v2.1.4.js'),
  'utf8',
);

module.exports = function ttsCheck(html) {
  const dom = new JSDOM('<!doctype html><div id="chapter"></div>', {
    runScripts: 'outside-only',
  });
  const root = dom.window.document.getElementById('chapter');
  root.innerHTML = html;
  dom.window.reader = { chapterElement: root };
  dom.window.eval(source);
  const elements = dom.window.tts.getAllReadableElements(root);
  const compact = text => text.replace(/\s+/g, '');
  const result = {
    paragraphs: elements.length,
    fullText: compact(root.textContent),
    spokenText: compact(elements.map(element => element.textContent).join('')),
  };
  dom.window.close();
  return result;
};

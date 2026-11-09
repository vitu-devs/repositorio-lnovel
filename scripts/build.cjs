const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const base =
  'https://raw.githubusercontent.com/vitu-devs/repositorio-lnovel/main';
const source = fs.readFileSync(
  path.join(root, 'plugins/portuguese/nexustoons.ts'),
  'utf8',
);
const result = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.CommonJS,
    strict: true,
  },
  reportDiagnostics: true,
});
if (result.diagnostics?.length)
  throw new Error(
    ts.formatDiagnosticsWithColorAndContext(result.diagnostics, {
      getCurrentDirectory: () => root,
      getCanonicalFileName: file => file,
      getNewLine: () => '\n',
    }),
  );
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/nexustoons.js'), result.outputText);
const manifest = [
  {
    id: 'nexustoons',
    name: 'Nexustoons (Novels)',
    site: 'https://nexustoons.com',
    lang: 'Português',
    version: '1.0.0',
    url: base + '/dist/nexustoons.js',
    iconUrl: base + '/public/static/src/pt-br/nexustoons/icon.png',
  },
];
fs.writeFileSync(path.join(root, 'plugins.min.json'), JSON.stringify(manifest));
console.log('Plugin ES5 e plugins.min.json gerados.');

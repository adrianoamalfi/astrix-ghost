import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const ignored = new Set(['.git', 'node_modules', 'dist']);

// Locales the maintainers keep complete: a missing key here fails the build.
// Every other locales/*.json is treated as a community translation — its
// completeness is reported but never blocks CI, so adding a UI string can't
// break a language the maintainers don't speak. See CONTRIBUTING.md.
const REQUIRED_LOCALES = new Set(['en.json', 'it.json']);

function walk(dir) {
  const entries = readdirSync(join(root, dir), { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;

    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(path));
    } else if (path.endsWith('.hbs')) {
      files.push(path);
    }
  }

  return files;
}

// The `t` helper appears both as a mustache ({{t "x"}}) and as a subexpression
// nested in another helper (e.g. reading_time minute=(t "x")); match both.
const T_HELPER = /(?:\{\{|\()t\s+"([^"]+)"/g;

const templateKeys = new Set();
const usages = new Map();

for (const file of walk('.')) {
  const content = readFileSync(join(root, file), 'utf8');

  for (const match of content.matchAll(T_HELPER)) {
    const key = match[1];
    templateKeys.add(key);
    if (!usages.has(key)) usages.set(key, []);
    if (!usages.get(key).includes(file)) usages.get(key).push(file);
  }
}

const localeFiles = readdirSync(join(root, 'locales'))
  .filter((name) => name.endsWith('.json'))
  .sort();

let hasError = false;

for (const name of localeFiles) {
  const localePath = `locales/${name}`;
  const translations = JSON.parse(readFileSync(join(root, localePath), 'utf8'));
  const missing = [...templateKeys].filter((key) => !(key in translations)).sort();
  const unused = Object.keys(translations).filter((key) => !templateKeys.has(key)).sort();

  if (missing.length) {
    if (REQUIRED_LOCALES.has(name)) {
      hasError = true;
      console.error(`i18n: ${localePath} missing ${missing.length} key(s)`);
      for (const key of missing) {
        console.error(`i18n:   missing "${key}" (used in ${usages.get(key).join(', ')})`);
      }
    } else {
      // Community locale: report how far behind it is, but don't fail CI.
      console.warn(`i18n: ${localePath} is ${missing.length} key(s) behind — not blocking`);
      for (const key of missing) {
        console.warn(`i18n:   todo "${key}"`);
      }
    }
  }

  if (unused.length) {
    console.warn(`i18n: ${localePath} has ${unused.length} unused key(s): ${unused.join(', ')}`);
  }
}

if (hasError) {
  process.exit(1);
}

const required = [...REQUIRED_LOCALES].join(', ');
console.log(`i18n: ok ${templateKeys.size} template keys across ${localeFiles.length} locale(s) (${required} required)`);

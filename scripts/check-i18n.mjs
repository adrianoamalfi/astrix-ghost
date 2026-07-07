import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const ignored = new Set(['.git', 'node_modules', 'dist']);
const locales = ['locales/en.json', 'locales/it.json'];

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

const templateKeys = new Set();
const usages = new Map();

for (const file of walk('.')) {
  const content = readFileSync(join(root, file), 'utf8');
  const matches = content.matchAll(/{{t\s+"([^"]+)"/g);

  for (const match of matches) {
    const key = match[1];
    templateKeys.add(key);
    if (!usages.has(key)) usages.set(key, []);
    usages.get(key).push(relative(root, join(root, file)));
  }
}

let hasError = false;

for (const localePath of locales) {
  const translations = JSON.parse(readFileSync(join(root, localePath), 'utf8'));
  const missing = [...templateKeys].filter((key) => !(key in translations)).sort();

  if (missing.length) {
    hasError = true;
    console.error(`i18n: ${localePath} missing ${missing.length} keys`);
    for (const key of missing) {
      console.error(`i18n: missing "${key}" used in ${usages.get(key).join(', ')}`);
    }
  }
}

if (hasError) {
  process.exit(1);
}

console.log(`i18n: ok ${templateKeys.size} template keys`);

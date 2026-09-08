import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const ignored = new Set(['.git', 'node_modules', 'dist']);

function walk(dir) {
  const files = [];

  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;

    const file = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(file));
    } else if (file.endsWith('.hbs')) {
      files.push(file);
    }
  }

  return files;
}

function lineNumber(content, index) {
  return content.slice(0, index).split('\n').length;
}

const errors = [];

for (const file of walk('.')) {
  const content = readFileSync(join(root, file), 'utf8');

  for (const match of content.matchAll(/<button\b[^>]*>/g)) {
    if (!/\stype=/.test(match[0])) {
      errors.push(`${file}:${lineNumber(content, match.index)} button missing type`);
    }
  }

  for (const match of content.matchAll(/<img\b[\s\S]*?>/g)) {
    const tag = match[0];
    const line = lineNumber(content, match.index);
    if (!/\salt=/.test(tag)) errors.push(`${file}:${line} image missing alt`);
    if (!/\sdecoding=/.test(tag)) errors.push(`${file}:${line} image missing decoding`);

    // An image whose alt is the post title or author name repeats text that
    // sits right next to it (the <h1>/card link, the byline link), so a screen
    // reader announces it twice. Those images are decorative-adjacent and must
    // carry alt="". {{@site.title}} on the logo is fine — there the image *is*
    // the link's only content.
    const alt = tag.match(/\salt="([^"]*)"/)?.[1];
    if (alt && /\{\{\s*(?:title|name)\s*\}\}/.test(alt)) {
      errors.push(
        `${file}:${line} image alt is {{title}}/{{name}} — use alt="" when the same text is adjacent`,
      );
    }
  }

  for (const match of content.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
    if (!/\srel=/.test(match[0])) {
      errors.push(`${file}:${lineNumber(content, match.index)} external link missing rel`);
    }
  }
}

const defaultTemplate = readFileSync(join(root, 'default.hbs'), 'utf8');
const skipTarget = defaultTemplate.match(
  /<a\b[^>]*class="[^"]*gh-skip-link[^"]*"[^>]*href="#([^"]+)"/,
)?.[1];
if (!skipTarget) {
  errors.push('default.hbs: skip link missing');
} else if (!defaultTemplate.includes(`id="${skipTarget}"`)) {
  errors.push(`default.hbs: skip link target #${skipTarget} missing`);
}

if (errors.length) {
  for (const error of errors) console.error(`a11y: ${error}`);
  process.exit(1);
}

console.log('a11y: ok');

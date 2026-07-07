import { statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const zipPath = 'dist/astrix.zip';
const { size } = statSync(zipPath);
const files = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

const required = [
  'package.json',
  'default.hbs',
  'index.hbs',
  'post.hbs',
  'assets/built/screen.css',
  'assets/built/main.js',
];

const forbidden = [
  /^assets\/css\//,
  /^assets\/js\//,
  /^scripts\//,
  /^node_modules\//,
  /^dist\//,
  /^\.git\//,
  /^\.claude\//,
  /^AGENTS\.md$/,
  /^VISUAL_QA\.md$/,
  /^package-lock\.json$/,
  /^postcss\.config\.cjs$/,
  /\.map$/,
];

const missing = required.filter((file) => !files.includes(file));
const leaked = files.filter((file) => forbidden.some((pattern) => pattern.test(file)));

if (missing.length || leaked.length) {
  if (missing.length) {
    console.error(`release: missing required files: ${missing.join(', ')}`);
  }
  if (leaked.length) {
    console.error(`release: forbidden files in zip: ${leaked.join(', ')}`);
  }
  process.exit(1);
}

const kb = Math.round(size / 1024);

console.log(`release: ${zipPath}`);
console.log(`release: ${kb} KB, ${files.length} entries`);
console.log('release: package contents ok');
console.log('release: upload via Ghost Admin -> Design -> Change theme');

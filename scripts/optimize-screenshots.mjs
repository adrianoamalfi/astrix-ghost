#!/usr/bin/env node
/*
 * Converts docs/screenshots/**\/*.png to WebP and drops the PNG source.
 *
 * The screenshots are page captures, not artwork — lossless PNG buys nothing
 * a reader can see, and it dominated the repo's tracked weight (~26 MB, versus
 * ~4,500 lines of CSS). WebP at q80 lands the same set around 3–4 MB.
 *
 * Idempotent: skips a PNG whose WebP already exists and is newer. Run after
 * regenerating screenshots, then update any new <img> paths to .webp.
 */
import { readdirSync, statSync, rmSync } from 'node:fs';
import { join, extname } from 'node:path';
import sharp from 'sharp';

const ROOT = 'docs/screenshots';
const QUALITY = 80;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (extname(entry.name).toLowerCase() === '.png') out.push(full);
  }
  return out;
}

const pngs = walk(ROOT);
if (!pngs.length) {
  console.log('optimize-screenshots: no PNG files under', ROOT);
  process.exit(0);
}

let converted = 0;
let bytesBefore = 0;
let bytesAfter = 0;

for (const png of pngs) {
  const webp = png.replace(/\.png$/i, '.webp');
  const before = statSync(png).size;
  await sharp(png).webp({ quality: QUALITY, effort: 6 }).toFile(webp);
  const after = statSync(webp).size;
  rmSync(png);
  bytesBefore += before;
  bytesAfter += after;
  converted += 1;
  console.log(
    `  ${png.replace(ROOT + '/', '')} → webp  ${(before / 1024) | 0}KB → ${(after / 1024) | 0}KB`,
  );
}

const mb = (n) => (n / 1024 / 1024).toFixed(1);
console.log(`optimize-screenshots: ${converted} files, ${mb(bytesBefore)}MB → ${mb(bytesAfter)}MB`);

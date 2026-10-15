#!/usr/bin/env node
/**
 * Export the four demo publications as a static site for GitHub Pages.
 *
 * Ghost renders at the site root — it does not honour a sub-path in `url` — so
 * this script crawls the running demos (booted via `docker compose`), rewrites
 * every URL to the /astrix-ghost/demos/<pub>/ base, strips the features that
 * need a live backend (search, comments, subscribe form, portal), and downloads
 * the images and assets. The result lands in docs/demos/ and is served by the
 * existing GitHub Pages build (branch main, path /docs).
 *
 * Usage:
 *   cd demo && docker compose up -d meridian vellum proof fieldnotes
 *   node scripts/export-static.mjs
 *
 * The theme itself is untouched: all static-demo adjustments happen here, on
 * the rendered HTML, so the installable theme keeps its full feature set.
 */
import { mkdir, writeFile, rm, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_ROOT = path.join(ROOT, 'docs', 'demos');
const PAGES_BASE = 'https://adrianoamalfi.github.io/astrix-ghost';

const PUBS = [
  { name: 'meridian', port: 8081 },
  { name: 'vellum', port: 8082 },
  { name: 'proof', port: 8083 },
  { name: 'fieldnotes', port: 8084 },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(base, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(base + '/');
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await sleep(2000);
  }
  return false;
}

async function sitemapPaths(base, kind) {
  const xml = await (await fetch(base + '/sitemap-' + kind + '.xml')).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
}

/** href of the pagination "next" link, regardless of attribute order. */
function nextHref(html) {
  const tag = html.match(/<a\b[^>]*\brel="next"[^>]*>/);
  if (!tag) return null;
  const href = tag[0].match(/href="([^"]+)"/);
  return href ? href[1] : null;
}

/** Every route to freeze: sitemap entries + home + any paginated list pages. */
async function discoverRoutes(base) {
  const routes = new Set(['/']);
  for (const kind of ['posts', 'pages', 'tags', 'authors']) {
    for (const p of await sitemapPaths(base, kind)) routes.add(p);
  }
  // Home, tag and author feeds can paginate; follow rel=next from each.
  const lists = [...routes].filter(
    (r) => r === '/' || r.startsWith('/tag/') || r.startsWith('/author/'),
  );
  for (const start of lists) {
    let cur = start;
    for (let depth = 0; depth < 25; depth++) {
      const html = await (await fetch(base + cur)).text();
      const next = nextHref(html);
      if (!next) break;
      const np = new URL(next, base).pathname;
      if (routes.has(np)) break;
      routes.add(np);
      cur = np;
    }
  }
  return [...routes].sort();
}

/**
 * Turn a page rendered at the Ghost root into a page that lives under
 * /astrix-ghost/demos/<pub>/. Order matters: strip backend features first,
 * then repoint absolute origin URLs, then prefix the remaining root-relative
 * ones (external https:// URLs are never touched).
 */
function rewriteHtml(html, { origin, base, basePath }) {
  // Features that only work against a live Ghost instance.
  html = html.replace(/<button[^>]*data-ghost-search[\s\S]*?<\/button>/g, '');
  html = html.replace(/<kbd class="gh-search-kbd"[^>]*>[\s\S]*?<\/kbd>/g, '');
  html = html.replace(/<section class="gh-comments"[\s\S]*?<\/section>/g, '');
  html = html.replace(/<div class="gh-members-form-wrap">[\s\S]*?<\/div>/g, '');
  html = html.replace(/<script[^>]*ghost\/portal@[\s\S]*?<\/script>/g, '');
  html = html.replace(/<script[^>]*ghost\/sodo-search@[\s\S]*?<\/script>/g, '');
  html = html.replace(/<script[^>]*comment-counts[\s\S]*?<\/script>/g, '');
  html = html.replace(/<script[^>]*member-attribution[\s\S]*?<\/script>/g, '');
  // Absolute Ghost-origin URLs (canonical, og:*, rss, webmentions, logo).
  html = html.split(origin).join(base);
  // Root-relative URLs in srcset (comma-separated list).
  html = html.replace(/srcset="([^"]*)"/g, (_m, val) => {
    const out = val
      .split(',')
      .map((part) => {
        const t = part.trim();
        if (!t) return part;
        const [url, ...desc] = t.split(/\s+/);
        return url.startsWith('/')
          ? basePath + url + (desc.length ? ' ' + desc.join(' ') : '')
          : part;
      })
      .join(', ');
    return 'srcset="' + out + '"';
  });
  // Root-relative URLs in CSS url() inside inline <style> (the @font-face in
  // default.hbs) — not caught by the href/src pass below.
  html = html.replace(
    /url\((["']?)(\/[^"')]+)\1\)/g,
    (_m, q, url) => `url(${q}${basePath}${url}${q})`,
  );
  // Root-relative URLs in href / src.
  html = html.replace(
    /(href|src)="(\/[^"]*)"/g,
    (_m, attr, url) => attr + '="' + basePath + url + '"',
  );
  // The feed is exported as rss.xml, not /rss/.
  html = html.split(base + '/rss/').join(base + '/rss.xml');
  return html;
}

/** Every /content/images/… path referenced by a page (prefixed or absolute). */
function collectImagePaths(html) {
  const set = new Set();
  for (const m of html.matchAll(/\/content\/images\/[^\s"')]+/g)) set.add(m[0]);
  return [...set];
}

async function pool(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function saveFile(file, data) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, data);
}

async function exportPub({ name, port }) {
  const origin = `http://localhost:${port}`;
  const base = `${PAGES_BASE}/demos/${name}`;
  const basePath = `/astrix-ghost/demos/${name}`;
  const out = path.join(OUT_ROOT, name);
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });

  if (!(await waitFor(origin))) throw new Error(`${name}: Ghost not answering at ${origin}`);

  const routes = await discoverRoutes(origin);
  const imagePaths = new Set();
  let pages = 0;

  for (const route of routes) {
    const res = await fetch(origin + route);
    if (!res.ok) {
      console.warn(`  ! ${name} ${route} → ${res.status}`);
      continue;
    }
    const html = rewriteHtml(await res.text(), { origin, base, basePath });
    for (const p of collectImagePaths(html)) imagePaths.add(p);
    await saveFile(path.join(out, route, 'index.html'), html);
    pages++;
  }

  // 404 page (GitHub Pages serves 404.html for unknown paths).
  {
    const res = await fetch(origin + '/404-not-found-test/');
    const html = rewriteHtml(await res.text(), { origin, base, basePath });
    for (const p of collectImagePaths(html)) imagePaths.add(p);
    await saveFile(path.join(out, '404.html'), html);
  }

  // RSS feed, exported as rss.xml.
  {
    const res = await fetch(origin + '/rss/');
    if (res.ok)
      await saveFile(path.join(out, 'rss.xml'), (await res.text()).split(origin).join(base));
  }

  // Theme assets are identical for every pub: copy the built CSS/JS and the
  // self-hosted fonts straight from the repo (already produced by `npm run build`).
  await cp(path.join(ROOT, 'assets', 'built'), path.join(out, 'assets', 'built'), {
    recursive: true,
  });
  await cp(path.join(ROOT, 'assets', 'fonts'), path.join(out, 'assets', 'fonts'), {
    recursive: true,
  });

  // Ghost-served public assets (Koenig cards) and the favicons. Ghost serves
  // /favicon.png as a redirect to /favicon.ico; fetch follows it, so the RSS
  // <image> reference resolves to a real file in the static export.
  for (const f of [
    '/public/cards.min.js',
    '/public/cards.min.css',
    '/favicon.ico',
    '/favicon.png',
  ]) {
    const res = await fetch(origin + f);
    if (!res.ok) {
      console.warn(`  ! ${name} ${f} → ${res.status}`);
      continue;
    }
    await saveFile(path.join(out, f), Buffer.from(await res.arrayBuffer()));
  }

  // Images, downloaded concurrently.
  const imgs = [...imagePaths];
  let bytes = 0;
  await pool(imgs, 12, async (p) => {
    const res = await fetch(origin + p);
    if (!res.ok) {
      console.warn(`  ! ${name} img ${p} → ${res.status}`);
      return;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await saveFile(path.join(out, p), buf);
    bytes += buf.length;
  });

  console.log(
    `${name}: ${pages} pages, ${imgs.length} images, ${(bytes / 1024 / 1024).toFixed(1)} MB of images`,
  );
  return { pages, images: imgs.length, bytes };
}

const started = Date.now();
const totals = { pages: 0, images: 0, bytes: 0 };
for (const pub of PUBS) {
  const r = await exportPub(pub);
  totals.pages += r.pages;
  totals.images += r.images;
  totals.bytes += r.bytes;
}
console.log(
  `\nExported ${totals.pages} pages and ${totals.images} images ` +
    `(${(totals.bytes / 1024 / 1024).toFixed(1)} MB) to ${path.relative(ROOT, OUT_ROOT)}/ in ${((Date.now() - started) / 1000).toFixed(1)}s`,
);

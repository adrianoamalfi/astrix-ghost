#!/usr/bin/env node
/*
 * Runs axe-core and a layout-shift check against a real Ghost render of the
 * theme. Everything else in the quality gate is static analysis of the .hbs
 * sources; this is the only check that sees the final DOM — computed colour
 * contrast, heading order, accessible names, ARIA wiring, and CLS — the class
 * of regression that passed gscan and shipped in v0.2.2 / v0.2.4.
 *
 *   GHOST_URL=http://localhost:2368 node scripts/check-rendered.mjs
 *
 * Routes are discovered from the sitemap, so it works against any Ghost that
 * serves the theme (a local dev install, or the demo container in CI).
 */
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer';

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve('axe-core');

const BASE = (process.env.GHOST_URL || 'http://localhost:2368').replace(/\/$/, '');
const CLS_BUDGET = 0.1;
const BLOCKING_IMPACTS = new Set(['serious', 'critical']);
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const problems = [];
const fail = (msg) => {
  problems.push(msg);
  console.error(`rendered: ${msg}`);
};

async function firstLoc(sitemap) {
  try {
    const xml = await (await fetch(`${BASE}/${sitemap}`)).text();
    const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
    // Ghost's pages sitemap can list the site root; the home route covers that.
    return paths.find((p) => p !== '/') ?? paths[0] ?? null;
  } catch {
    return null;
  }
}

async function discoverRoutes() {
  const [post, page, tag, author] = await Promise.all([
    firstLoc('sitemap-posts.xml'),
    firstLoc('sitemap-pages.xml'),
    firstLoc('sitemap-tags.xml'),
    firstLoc('sitemap-authors.xml'),
  ]);
  const routes = [{ name: 'home', path: '/', status: 200 }];
  if (post) routes.push({ name: 'post', path: post, status: 200, cls: true });
  if (page) routes.push({ name: 'page', path: page, status: 200 });
  if (tag) routes.push({ name: 'tag', path: tag, status: 200, cls: true });
  if (author) routes.push({ name: 'author', path: author, status: 200 });
  routes.push({ name: '404', path: '/__astrix-rendered-404__/', status: 404 });
  return routes;
}

const CLS_PROBE = `
  globalThis.__cls = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) globalThis.__cls += entry.value;
    }
  }).observe({ type: 'layout-shift', buffered: true });
`;

async function checkRoute(browser, route, scheme) {
  const label = `${route.name} ${route.path} [${scheme}]`;
  const page = await browser.newPage();
  await page.setCacheEnabled(false); // second scheme load would 304 otherwise
  await page.setViewport({ width: 1280, height: 900 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await page.evaluateOnNewDocument(CLS_PROBE);

  let response;
  try {
    response = await page.goto(`${BASE}${route.path}`, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
  } catch (err) {
    fail(`${label} did not load: ${err.message}`);
    await page.close();
    return;
  }

  if (response.status() !== route.status) {
    fail(`${label} status ${response.status()}, expected ${route.status}`);
  }

  if (route.name === '404' && !(await page.$('h1'))) {
    fail(`${label} has no <h1>`);
  }

  // axe — skip third-party injected widgets (Portal, sodo-search) that the
  // theme does not own.
  await page.addScriptTag({ path: AXE_PATH });
  const { violations } = await page.evaluate(async (tags) => {
    return await globalThis.axe.run(
      {
        exclude: [
          ['iframe'],
          ['#ghost-portal-root'],
          ['.gh-portal-root'],
          ['[data-ghost-comments]'],
        ],
      },
      { resultTypes: ['violations'], runOnly: { type: 'tag', values: tags } },
    );
  }, AXE_TAGS);

  for (const v of violations) {
    if (!BLOCKING_IMPACTS.has(v.impact)) continue;
    const where = v.nodes
      .slice(0, 3)
      .map(
        (n) => `      ${n.target.join(' ')}\n        ${n.html.replace(/\s+/g, ' ').slice(0, 160)}`,
      )
      .join('\n');
    fail(
      `${label} ${v.impact}: ${v.id} (${v.nodes.length}×) — ${v.help}\n    ${v.helpUrl}\n${where}`,
    );
  }

  if (route.cls && scheme === 'light') {
    await new Promise((r) => setTimeout(r, 1500));
    const cls = await page.evaluate(() => globalThis.__cls || 0);
    if (cls > CLS_BUDGET) {
      fail(`${label} CLS ${cls.toFixed(3)} over budget ${CLS_BUDGET}`);
    } else {
      console.log(`rendered: ${label} CLS ${cls.toFixed(3)}`);
    }
  }

  if (!problems.some((p) => p.startsWith(label))) {
    console.log(`rendered: ${label} ok`);
  }
  await page.close();
}

const routes = await discoverRoutes();
console.log(`rendered: ${BASE} — ${routes.map((r) => r.name).join(', ')}`);

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
try {
  for (const route of routes) {
    for (const scheme of ['light', 'dark']) {
      await checkRoute(browser, route, scheme);
    }
  }
} finally {
  await browser.close();
}

if (problems.length) {
  console.error(`\nrendered: ${problems.length} problem(s)`);
  process.exit(1);
}
console.log('\nrendered: ok');

#!/usr/bin/env node
/* global document, location */
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

/*
 * External-link decoration on a real post/page. The static gate cannot see
 * this: external-links.js runs in the browser and rewrites the anchors after
 * Ghost has rendered {{content}}. If the demo post has no external body link,
 * the check is skipped with an explicit message rather than passing silently.
 */
async function checkBodyLinks(page, label) {
  const links = await page.evaluate(() => {
    const content = document.querySelector('.gh-content');
    if (!content) return null;

    const normalize = (host) => host.toLowerCase().replace(/^www\./, '');
    const pageHost = normalize(location.hostname);
    const skipped =
      '.kg-card, .kg-embed-card, .kg-bookmark-card, .kg-gallery-card, figure, [data-ghost-embed]';

    return [...content.querySelectorAll('a[href]')].map((link) => {
      let external = false;
      try {
        const url = new URL(link.getAttribute('href'), location.href);
        external =
          (url.protocol === 'http:' || url.protocol === 'https:') &&
          normalize(url.hostname) !== pageHost;
      } catch {
        /* malformed or non-URL: not external for this check */
      }

      return {
        href: link.getAttribute('href'),
        external,
        inCard: Boolean(link.closest(skipped)),
        text: link.textContent.replace(/\s+/g, ' ').trim(),
        decorated: Object.hasOwn(link.dataset, 'externalLink'),
        target: link.getAttribute('target'),
        rel: (link.getAttribute('rel') || '').split(/\s+/).filter(Boolean),
        icon: Boolean(link.querySelector('.gh-external-link-icon')),
        label: Boolean(link.querySelector('[data-external-link-label]')),
      };
    });
  });

  if (links === null) {
    fail(`${label} has no .gh-content to check external links`);
    return;
  }

  const candidates = links.filter((link) => link.external && !link.inCard && link.text);
  const internal = links.filter((link) => !link.external && !link.inCard && link.text);

  if (!candidates.length) {
    console.log(`rendered: ${label} no external body link to check — skipped`);
  }

  for (const link of candidates.slice(0, 5)) {
    const problems = [];
    if (!link.decorated) problems.push('missing data-external-link');
    if (link.target !== '_blank') problems.push('missing target="_blank"');
    if (!link.rel.includes('noopener')) problems.push('missing rel="noopener"');
    if (!link.rel.includes('noreferrer')) problems.push('missing rel="noreferrer"');
    if (!link.icon) problems.push('missing icon');
    if (!link.label) problems.push('missing hidden "Opens in a new tab"');
    if (problems.length) fail(`${label} external link ${link.href}: ${problems.join(', ')}`);
  }

  for (const link of internal.slice(0, 5)) {
    if (link.decorated || link.target || link.icon || link.label) {
      fail(`${label} internal link ${link.href} was treated as external`);
    }
  }
}

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

  if (route.name === 'post' || route.name === 'page') {
    await checkBodyLinks(page, label);
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

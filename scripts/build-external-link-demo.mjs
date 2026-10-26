#!/usr/bin/env node
/**
 * Build the standalone external-link demo that is published with the docs
 * showcase at docs/external-link-icons/.
 *
 * The demo is not a mock: it loads the real classification module, the real
 * component CSS and the real SVG partials from the theme, so the page in
 * docs/ cannot drift from the feature. `npm run check` runs this script with
 * --check and fails when the generated files are stale.
 *
 * Usage:
 *   npm run build:demo             # regenerate the page and module copy
 *   npm run check:demo             # fail if they are out of date
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'external-link-icons');

const args = new Set(process.argv.slice(2));
const check = args.has('--check');

const LABELS = {
  github: 'GitHub',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  facebook: 'Facebook',
  x: 'X',
  youtube: 'YouTube',
  threads: 'Threads',
  bluesky: 'Bluesky',
  tiktok: 'TikTok',
  huggingface: 'Hugging Face',
  google: 'Google',
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  microsoft: 'Microsoft',
  apple: 'Apple',
  amazon: 'Amazon',
  kaggle: 'Kaggle',
  gitlab: 'GitLab',
  npm: 'npm',
  medium: 'Medium',
  substack: 'Substack',
  reddit: 'Reddit',
  discord: 'Discord',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  spotify: 'Spotify',
  figma: 'Figma',
  notion: 'Notion',
  wikipedia: 'Wikipedia',
  arxiv: 'arXiv',
};

const IMAGE_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='72'%3E%3Crect width='120' height='72' rx='6' fill='%23ccd3db'/%3E%3C/svg%3E";

function resolvePartials(source) {
  let out = source
    .replace(/\{\{!--[\s\S]*?--\}\}/g, '')
    .replace(/\{\{\s*t\s+"([^"]+)"\s*\}\}/g, '$1');

  for (let i = 0; i < 20; i++) {
    let changed = false;
    out = out.replace(/\{\{\s*>\s*"([^"]+)"\s*\}\}/g, (_, name) => {
      changed = true;
      return readFileSync(path.join(ROOT, 'partials', `${name}.hbs`), 'utf8');
    });
    if (!changed) break;
  }

  return out.trim();
}

function serviceCatalog(source) {
  const services = new Map();
  for (const match of source.matchAll(/\['([^']+)',\s*'([^']+)'\]/g)) {
    const [, domain, service] = match;
    if (!services.has(service)) services.set(service, []);
    services.get(service).push(domain);
  }
  return [...services].map(([service, domains]) => ({
    service,
    label: LABELS[service] || service,
    domains,
  }));
}

function brandList(catalog) {
  return catalog
    .map(
      ({ service, label, domains }) =>
        `            <li><a href="https://${domains[0]}/" data-expect="brand" data-expect-service="${service}">${label}</a></li>`,
    )
    .join('\n');
}

function serviceTable(catalog) {
  return catalog
    .map(
      ({ label, domains }) =>
        `            <tr><th scope="row">${label}</th><td>${domains
          .map((domain) => `<code>${domain}</code>`)
          .join(', ')}</td></tr>`,
    )
    .join('\n');
}

function article(id, catalog) {
  return `          <div class="gh-content">
            <p>The theme classifies every link inside <code>.gh-content</code> after Ghost renders it. A <a href="../" data-expect="internal">relative internal link</a> stays in this tab. A <a href="https://github.com/adrianoamalfi/astrix-ghost" data-expect="brand" data-expect-service="github">GitHub link</a> gets the GitHub mark and opens in a new tab. A <a href="https://example.org/field-notes" data-expect="generic">host the theme does not recognize</a> gets the generic external mark.</p>
            <p>Existing <code>rel</code> tokens survive: <a href="https://example.net/report" rel="nofollow sponsored" data-expect="rel">this link</a> keeps <code>nofollow sponsored</code> and gains <code>noopener noreferrer</code>. Subdomains resolve too: <a href="https://it.wikipedia.org/wiki/Typography" data-expect="brand" data-expect-service="wikipedia">it.wikipedia.org</a> uses the Wikipedia icon, and <a href="https://open.spotify.com/" data-expect="brand" data-expect-service="spotify">open.spotify.com</a> uses Spotify. <a href="#" data-demo-same-host data-expect="internal">An absolute URL to this same page</a> is internal.</p>

            <h3 id="services-${id}">Recognized services</h3>
            <p>One link per supported service, matched on the exact domain or a subdomain:</p>
            <ul class="brands">
${brandList(catalog)}
            </ul>

            <h3>Deliberately left alone</h3>
            <ul class="untouched">
              <li>An <a href="#services-${id}" data-expect="untouched">in-page anchor</a>.</li>
              <li><a href="mailto:hello@example.org" data-expect="untouched">mailto:hello@example.org</a>.</li>
              <li><a href="tel:+391234567890" data-expect="untouched">tel:+39 123 456 7890</a>.</li>
              <li>An <a href="https://example.org/photo" data-expect="untouched"><img class="inline-thumb" src="${IMAGE_PLACEHOLDER}" alt="A photo"></a> image-only link.</li>
              <li>A link inside a card: <span class="kg-card kg-bookmark-card"><a href="https://example.com/article" data-expect="untouched">Bookmark card link</a></span>.</li>
            </ul>
            <p class="muted">Unknown hosts get the generic mark. Mastodon is federated and deliberately generic: it has no single domain.</p>
          </div>`;
}

function pageHtml(catalog, iconsTemplate, cssSource, tokensSource) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Astrix — External link icons demo</title>
<meta name="description" content="Live demo of the Astrix Ghost theme external-link icons: every supported service, generic external links, the rules, and the links the theme leaves alone.">
<meta name="robots" content="index, follow">
<style>
${tokensSource}
</style>
<style>
:root {
  --gh-accent: #11245c;
  --gh-accent-text: #11245c;
  --gh-accent-line: #8a93b0;
  --gh-text-secondary: #4e606f;
  color-scheme: light dark;
}
*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  background: var(--color-background-body);
  color: var(--color-text-primary);
  font-family: var(--font-family-body);
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}
a { color: inherit; }
img { max-width: 100%; }
code {
  font-family: var(--font-family-code);
  font-size: 0.88em;
}
.wrap { width: min(1180px, 100% - 2.5rem); margin-inline: auto; }
.top {
  position: sticky;
  top: 0;
  z-index: 10;
  background: color-mix(in oklab, var(--color-background-body) 88%, transparent);
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: saturate(1.2) blur(10px);
}
.top .wrap { display: flex; align-items: center; gap: 1rem; min-height: 60px; }
.brand { font-weight: 800; letter-spacing: -0.02em; text-decoration: none; }
.brand b { color: var(--gh-accent-text); }
.crumb { color: var(--color-text-secondary); font-size: 0.9rem; }
.top nav { margin-left: auto; display: flex; gap: 1.2rem; font-size: 0.9rem; }
.top nav a { color: var(--color-text-secondary); text-decoration: none; }
.top nav a:hover { color: var(--color-text-primary); }
main { padding: clamp(2rem, 5vw, 3.5rem) 0 4rem; }
.eyebrow {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #7d6000;
}
h1 { margin: 0.35rem 0 0.6rem; font-size: clamp(2rem, 5vw, 3.2rem); line-height: 1.05; letter-spacing: -0.03em; }
.lead { max-width: 68ch; margin: 0 0 0.8rem; font-size: 1.08rem; color: var(--color-text-secondary); }
.legend { max-width: 68ch; margin: 0 0 2rem; font-size: 0.95rem; color: var(--color-text-secondary); }
.panels { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem; align-items: start; }
@media (max-width: 900px) { .panels { grid-template-columns: 1fr; } }
.demo-panel {
  --color-background-body: #f1f4f7;
  --color-background-surface: #ffffff;
  --color-text-primary: #0a1317;
  --color-text-secondary: #4e606f;
  --color-border: #ccd3db;
  --gh-accent: #11245c;
  --gh-accent-text: #11245c;
  --gh-accent-line: #8a93b0;
  padding: 1.35rem 1.4rem 1.5rem;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-background-body);
  color: var(--color-text-primary);
}
.demo-panel--dark {
  --color-background-body: #111112;
  --color-background-surface: #1f1f22;
  --color-text-primary: #dfe2e5;
  --color-text-secondary: #aaafb5;
  --color-border: #494d53;
  --gh-accent: #8ea0d8;
  --gh-accent-text: #a9b8e8;
  --gh-accent-line: #4c5f96;
}
.panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--color-border);
}
.panel-head h2 { margin: 0; font-size: 0.82rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-text-secondary); }
.panel-head span { font-size: 0.78rem; color: var(--color-text-secondary); }
.gh-content { font-size: 0.98rem; line-height: 1.65; }
.gh-content p { margin: 0 0 1rem; }
.gh-content h3 { margin: 1.6rem 0 0.5rem; font-size: 1.02rem; letter-spacing: -0.01em; }
.gh-content a {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: var(--gh-accent-line);
  text-decoration-thickness: 2px;
  text-underline-offset: 0.2em;
  transition: color var(--duration-fast) var(--ease-standard);
}
.gh-content a:hover { color: var(--gh-accent-text); }
.gh-content a:focus-visible { outline: 2px solid #7d6000; outline-offset: 2px; }
.gh-content code { background: color-mix(in oklab, var(--gh-accent) 9%, transparent); padding: 0.08em 0.3em; border-radius: 4px; }
.brands { display: flex; flex-wrap: wrap; gap: 0.45rem; margin: 0.8rem 0 1rem; padding: 0; list-style: none; }
.brands li { margin: 0; }
.brands a {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.28rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  font-size: 0.8rem;
  text-decoration: none;
  background: var(--color-background-surface);
}
.brands a:hover { border-color: var(--gh-accent-line); }
.untouched { display: grid; gap: 0.45rem; margin: 0.6rem 0 1rem; padding: 0; list-style: none; }
.untouched li { padding: 0.4rem 0.55rem; border: 1px dashed var(--color-border); border-radius: 8px; font-size: 0.9rem; }
.inline-thumb { width: 5rem; height: 3rem; border-radius: 0.4rem; vertical-align: middle; }
.kg-bookmark-card { display: inline-block; padding: 0.15rem 0.45rem; border: 1px solid var(--color-border); border-radius: 6px; background: var(--color-background-surface); }
.kg-bookmark-card a { text-decoration: none; }
.muted { color: var(--color-text-secondary); font-size: 0.88rem; }
.report {
  margin: 2rem 0;
  padding: 1.1rem 1.3rem;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-background-surface);
}
.report h2 { margin: 0 0 0.4rem; font-size: 1.05rem; }
#demo-status { font-weight: 800; }
#demo-status[data-state='pass'] { color: #0d8626; }
#demo-status[data-state='fail'] { color: #e3193b; }
#demo-detail { margin: 0.3rem 0 0; color: var(--color-text-secondary); font-size: 0.92rem; }
.notes { margin-top: 2.5rem; }
.notes h2 { font-size: 1.35rem; letter-spacing: -0.02em; margin: 0 0 0.5rem; }
.notes p { max-width: 70ch; color: var(--color-text-secondary); }
.tablewrap { overflow-x: auto; margin-top: 0.8rem; }
table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
th, td { text-align: left; padding: 0.45rem 0.65rem; border-bottom: 1px solid var(--color-border); vertical-align: top; }
th { font-weight: 700; }
footer.site { margin-top: 3rem; padding-top: 1.2rem; border-top: 1px solid var(--color-border); color: var(--color-text-secondary); font-size: 0.88rem; }
footer.site a { color: var(--gh-accent-text); }
.u-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
body.embed .top,
body.embed .eyebrow,
body.embed h1,
body.embed .lead,
body.embed .legend,
body.embed .notes,
body.embed footer.site {
  display: none;
}
body.embed .wrap { width: min(1180px, 100% - 1.5rem); }
body.embed main { padding: 1rem 0 1.5rem; }
body.embed .report { margin: 1.2rem 0 0; }
${cssSource}
</style>
</head>
<body>
<header class="top">
  <div class="wrap">
    <a class="brand" href="../"><b>Astrix</b> demo</a>
    <span class="crumb">External link icons</span>
    <nav>
      <a href="../#external-links">Documentation</a>
      <a href="https://github.com/adrianoamalfi/astrix-ghost/blob/main/assets/js/modules/external-links.js">Source</a>
    </nav>
  </div>
</header>

<main class="wrap">
  <p class="eyebrow">Feature demo · v0.5.0</p>
  <h1>External link icons</h1>
  <p class="lead">This page uses the theme's real module, component CSS and SVG partials. It marks links that leave the publication, leaves internal and non-web links alone, and checks its own result against the rules.</p>
  <p class="legend">Both panels show the same markup with a forced colour scheme, so you can compare light and dark side by side. Hover or tab to a link to see the icon reach full ink. The panel content is not a Ghost install — the theme is the same one the demo publications run.</p>

  <div class="panels">
    <section class="demo-panel" data-panel="light" aria-labelledby="light-title">
      <div class="panel-head"><h2 id="light-title">Light scheme</h2><span>Forced light</span></div>
${article('light', catalog)}
    </section>
    <section class="demo-panel demo-panel--dark" data-panel="dark" aria-labelledby="dark-title">
      <div class="panel-head"><h2 id="dark-title">Dark scheme</h2><span>Forced dark</span></div>
${article('dark', catalog)}
    </section>
  </div>

  <section class="report" aria-labelledby="report-title">
    <h2 id="report-title">Result on this page</h2>
    <p><span id="demo-status" data-state="pending">Running…</span></p>
    <p id="demo-detail">The page checks every example after the module runs.</p>
  </section>

  <section class="notes" id="services">
    <h2>What the module does</h2>
    <p>It runs on a post or page only. It reads every <code>a[href]</code> inside <code>.gh-content</code>, resolves the URL against the page, accepts only <code>http:</code> and <code>https:</code>, normalizes <code>www.</code> on both sides, and compares the hosts. Same host: no change. Different host: one icon, <code>target="_blank"</code>, <code>noopener noreferrer</code> merged with the existing <code>rel</code>, and a visually hidden “Opens in a new tab” label.</p>
    <p>The icon is decorative (<code>aria-hidden</code>), inherits <code>currentColor</code>, sits at 55% opacity at rest, reaches full opacity on hover and keyboard focus, and is hidden in print. There is never more than one icon.</p>

    <h2 style="margin-top:2rem">Recognized services</h2>
    <p>A service matches its exact domain or a subdomain. The most specific domain wins, so <code>open.spotify.com</code> uses Spotify and <code>aws.amazon.com</code> uses Amazon. Everything else gets the generic Feather <code>external-link</code> mark.</p>
    <div class="tablewrap"><table>
      <thead><tr><th scope="col">Service</th><th scope="col">Domains</th></tr></thead>
      <tbody>
${serviceTable(catalog)}
      </tbody>
    </table></div>
  </section>

  <footer class="site">
    <p>Generated from the theme sources by <code>scripts/build-external-link-demo.mjs</code>. Do not edit this page by hand: run <code>npm run build:demo</code>. Icons: Simple Icons (CC0) and a Feather-style generic mark (MIT).</p>
  </footer>
</main>

${iconsTemplate}

<script type="module">
  import { initExternalLinks } from './external-links.js';

  if (new URLSearchParams(location.search).has('embed')) {
    document.body.classList.add('embed');
  }

  for (const link of document.querySelectorAll('[data-demo-same-host]')) {
    link.href = location.href.split('#')[0];
  }

  initExternalLinks();

  const expectations = [...document.querySelectorAll('[data-expect]')];
  const failures = [];

  for (const link of expectations) {
    const kind = link.dataset.expect;
    const tokens = (link.getAttribute('rel') || '')
      .toLowerCase()
      .split(/\\s+/)
      .filter(Boolean);
    const decorated = link.hasAttribute('data-external-link');
    const hasIcon = Boolean(link.querySelector('.gh-external-link-icon'));
    const hasLabel = Boolean(link.querySelector('[data-external-link-label]'));

    let ok;
    if (kind === 'internal' || kind === 'untouched') {
      ok =
        !decorated &&
        !link.hasAttribute('target') &&
        !hasIcon &&
        !hasLabel;
    } else {
      ok =
        decorated &&
        link.target === '_blank' &&
        tokens.includes('noopener') &&
        tokens.includes('noreferrer') &&
        hasIcon &&
        hasLabel;
      if (ok && link.dataset.expectService) {
        ok = link.dataset.externalService === link.dataset.expectService;
      }
      if (ok && kind === 'rel') {
        ok = tokens.includes('nofollow') && tokens.includes('sponsored');
      }
    }

    if (!ok) {
      failures.push({
        kind,
        text: link.textContent.trim().replace(/\\s+/g, ' ').slice(0, 48),
        service: link.dataset.externalService || 'none',
      });
    }
  }

  const external = document.querySelectorAll('.gh-content a[data-external-link]').length;
  const total = document.querySelectorAll('.gh-content a[href]').length;
  const status = document.getElementById('demo-status');
  const detail = document.getElementById('demo-detail');

  if (failures.length) {
    status.textContent = 'FAIL — ' + failures.length + ' of ' + expectations.length + ' checks failed';
    status.dataset.state = 'fail';
    detail.textContent = failures
      .slice(0, 5)
      .map((f) => f.kind + ': “' + f.text + '” (got ' + f.service + ')')
      .join(' · ');
  } else {
    status.textContent = 'PASS — ' + expectations.length + ' checks';
    status.dataset.state = 'pass';
    detail.textContent =
      external +
      ' external links decorated with an icon, a new tab and the hidden label; ' +
      (total - external) +
      ' links left untouched.';
  }

  document.documentElement.dataset.demoReady = 'true';
</script>
</body>
</html>
`;
}

async function main() {
  const moduleSource = await readFile(
    path.join(ROOT, 'assets', 'js', 'modules', 'external-links.js'),
    'utf8',
  );
  const cssSource = await readFile(
    path.join(ROOT, 'assets', 'css', 'theme', 'components', 'external-links.css'),
    'utf8',
  );
  const tokensSource = await readFile(
    path.join(ROOT, 'assets', 'css', 'vendor', 'astryx-tokens.css'),
    'utf8',
  );
  const iconsTemplate = resolvePartials(
    await readFile(path.join(ROOT, 'partials', 'external-link-icons.hbs'), 'utf8'),
  );

  const catalog = serviceCatalog(moduleSource);
  const moduleCopy = `/* Generated by scripts/build-external-link-demo.mjs from assets/js/modules/external-links.js. Do not edit. */\n${moduleSource}`;
  const html = pageHtml(catalog, iconsTemplate, cssSource, tokensSource);

  if (check) {
    const targets = [
      [path.join(OUT_DIR, 'external-links.js'), moduleCopy],
      [path.join(OUT_DIR, 'index.html'), html],
    ];
    let stale = 0;
    for (const [file, expected] of targets) {
      let actual;
      try {
        actual = await readFile(file, 'utf8');
      } catch {
        actual = '';
      }
      if (actual !== expected) {
        stale += 1;
        console.error(`demo: ${path.relative(ROOT, file)} is out of date — run npm run build:demo`);
      }
    }
    if (stale) process.exit(1);
    console.log('demo: docs/external-link-icons is in sync with the theme sources');
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, 'external-links.js'), moduleCopy);
  await writeFile(path.join(OUT_DIR, 'index.html'), html);
  console.log('demo: wrote docs/external-link-icons/index.html');
  console.log('demo: wrote docs/external-link-icons/external-links.js');
}

await main();

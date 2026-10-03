/* Standalone browser regression: no Ghost server or production writes.
 * TABLE_BASELINE=1 records the pre-fix bundles without asserting containment.
 * TABLE_ARTIFACTS and optional TABLE_CSS / TABLE_JS select evidence paths.
 */
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer';

const baseline = process.env.TABLE_BASELINE === '1';
const artifacts = process.env.TABLE_ARTIFACTS || 'dist/table-check';
mkdirSync(artifacts, { recursive: true });
const fixture = readFileSync('test/fixtures/tables.html', 'utf8');
const css = readFileSync('assets/built/screen.css', 'utf8');
const postCss = readFileSync(process.env.TABLE_CSS || 'assets/built/post.css', 'utf8');
const postJs = readFileSync(process.env.TABLE_JS || 'assets/built/post.js', 'utf8');
const tableModule = readFileSync('assets/js/modules/tables.js', 'utf8');
const font = readFileSync('assets/fonts/figtree-latin.woff2').toString('base64');
const results = [];
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

try {
  console.log(await browser.version());
  for (const layout of ['post', 'page']) {
    for (const scheme of ['light', 'dark']) {
      for (const width of [320, 390, 768, 1280]) {
        const page = await browser.newPage();
        await page.setViewport({ width, height: 900 });
        await page.emulateMediaFeatures([
          { name: 'prefers-color-scheme', value: scheme },
          { name: 'prefers-reduced-motion', value: 'reduce' },
        ]);
        const content =
          layout === 'post'
            ? fixture
                .replace(
                  '<section',
                  '<div class="gh-article-layout has-toc"><div class="gh-article-column"><section',
                )
                .replace('</section>', '</section></div></div>')
            : fixture;
        const html = `<!doctype html>
          <html lang="it" data-astryx-theme="neutral" style="color-scheme:${scheme}">
          <head><meta name="viewport" content="width=device-width,initial-scale=1">
          <title>Table regression</title><style>${css}\n${postCss}
          @font-face {font-family:Figtree;font-style:normal;font-weight:300 900;
          src:url(data:font/woff2;base64,${font}) format('woff2');}</style></head>
          <body><main>${content}</main></body></html>`;
        await page.setContent(html);
        await page.addScriptTag({ content: postJs });
        await page.evaluate(() => globalThis.document.fonts.ready);
        const metrics = await page.evaluate(() => {
          const table = globalThis.document.querySelector('#wide');
          const wrapper = table.closest('.gh-table-scroll');
          const blocks = Object.fromEntries(
            ['short', 'code', 'image', 'callout', 'wide-card'].map((id) => {
              const rect = globalThis.document.getElementById(id).getBoundingClientRect();
              return [id, { width: rect.width, height: rect.height }];
            }),
          );
          return {
            viewport: globalThis.innerWidth,
            document: globalThis.document.documentElement.scrollWidth,
            table: table.getBoundingClientRect().width,
            local: wrapper && { client: wrapper.clientWidth, scroll: wrapper.scrollWidth },
            blocks,
          };
        });
        const label = `${layout}-${scheme}-${width}`;
        results.push({ label, ...metrics });
        console.log(`${label}: ${JSON.stringify(metrics)}`);

        if (!baseline) {
          assert.ok(metrics.document <= width + 1, `${label}: document overflow`);
          assert.ok(metrics.local, `${label}: missing local scrollport`);
          const scrolls = metrics.local.scroll > metrics.local.client;
          assert.equal(
            await page.$eval('#wide', (table) => table.parentElement.hasAttribute('tabindex')),
            scrolls,
          );
          assert.equal(
            await page.$eval('#short', (table) => table.parentElement.hasAttribute('tabindex')),
            false,
          );
          if (scrolls) {
            await page.$eval('#wide', (table) => table.parentElement.focus());
            await page.keyboard.press('ArrowRight');
            await page.waitForFunction(
              () => globalThis.document.querySelector('#wide').parentElement.scrollLeft > 0,
              { timeout: 2000 },
            );
            assert.equal(
              await page.$eval(
                '#wide',
                (table) => globalThis.getComputedStyle(table.parentElement).outlineStyle,
              ),
              'solid',
            );
            // All columns, including the last cell, can enter the scrollport.
            assert.ok(
              await page.$eval('#wide', (table) => {
                const wrapper = table.parentElement;
                wrapper.scrollLeft = wrapper.scrollWidth;
                const cell = table.rows[table.rows.length - 1].cells[4];
                return (
                  cell.getBoundingClientRect().right <= wrapper.getBoundingClientRect().right + 1
                );
              }),
            );
            await page.$eval('#wide', (table) => {
              table.parentElement.scrollLeft = 0;
            });
          }
          // The browser accessibility tree retains the table and all cells.
          const session = await page.createCDPSession();
          const tree = await session.send('Accessibility.getFullAXTree');
          assert.ok(tree.nodes.some((node) => node.role?.value === 'table'));
          assert.ok(tree.nodes.some((node) => node.role?.value === 'columnheader'));
          assert.ok(
            tree.nodes.some(
              (node) => node.role?.value === 'columnheader' && node.name?.value === 'OpenClaw',
            ),
          );
          await session.detach();
          await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
          const violations = await page.evaluate(
            async () =>
              (
                await globalThis.axe.run('.gh-table-scroll', {
                  runOnly: [
                    'scrollable-region-focusable',
                    'color-contrast',
                    'td-headers-attr',
                    'th-has-data-cells',
                  ],
                })
              ).violations,
          );
          assert.deepEqual(violations, [], `${label}: axe violations`);
        }
        if (width === 390 && layout === 'post') {
          // Keyboard focus may scroll a tall table into view. Capture the
          // same starting position as the baseline, after key scrolling ends.
          await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 200)));
          await page.evaluate(() => {
            const wrapper = globalThis.document.querySelector('#wide').closest('.gh-table-scroll');
            wrapper?.blur();
            wrapper?.scrollTo({ left: 0, behavior: 'instant' });
            globalThis.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          });
          await page.screenshot({
            path: join(artifacts, `${baseline ? 'before' : 'after'}-${scheme}.png`),
          });
        }
        if (!baseline) {
          await page.evaluate(async (source) => {
            const { initTables } = await import(
              `data:text/javascript,${encodeURIComponent(source)}`
            );
            const content = globalThis.document.querySelector('.gh-content');
            for (const name of ['kg-width-wide', 'kg-width-full']) {
              const table = globalThis.document.querySelector('#wide').cloneNode(true);
              table.id = name;
              table.className = name;
              content.append(table);
            }
            const card = globalThis.document.createElement('div');
            card.className = 'kg-html-card';
            card.innerHTML =
              '<table><caption>Tabella HTML</caption><tr><td>' +
              'longword'.repeat(80) +
              '</td></tr></table>';
            content.append(card);
            initTables();
            initTables();
          }, tableModule);
          assert.equal(await page.$$eval('.gh-table-scroll', (wrappers) => wrappers.length), 5);
          assert.equal(
            await page.$$eval('.gh-table-scroll .gh-table-scroll', (wrappers) => wrappers.length),
            0,
          );
          for (const id of ['kg-width-wide', 'kg-width-full']) {
            const breakoutWidth = await page.$eval(
              `#${id}`,
              (table) => table.parentElement.getBoundingClientRect().width,
            );
            const expectedWidth =
              id === 'kg-width-wide' ? metrics.blocks['wide-card'].width : width;
            assert.ok(Math.abs(breakoutWidth - expectedWidth) < 1, `${label}: ${id} layout`);
          }
          await page.waitForFunction(() => {
            const wrapper = globalThis.document.querySelector('.kg-html-card .gh-table-scroll');
            return wrapper.getAttribute('aria-label') === 'Tabella HTML' && wrapper.tabIndex === 0;
          });
          // Resize and intrinsic content changes must update keyboard access.
          await page.$eval('#short', (table) => {
            table.rows[1].cells[1].textContent = 'longword'.repeat(80);
          });
          await page.waitForFunction(
            () => globalThis.document.querySelector('#short').parentElement.tabIndex === 0,
          );
          await page.$eval('#short', (table) => {
            table.rows[1].cells[1].textContent = '6';
          });
          await page.waitForFunction(
            () =>
              !globalThis.document.querySelector('#short').parentElement.hasAttribute('tabindex'),
          );
          await page.setViewport({ width: width === 320 ? 1280 : 320, height: 900 });
          await page.waitForFunction(() => {
            const wrapper = globalThis.document.querySelector('#wide').parentElement;
            return wrapper.hasAttribute('tabindex') === wrapper.scrollWidth > wrapper.clientWidth;
          });
          await page.setViewport({ width, height: 900 });
          // No global clipping is needed to contain the table.
          await page.addStyleTag({ content: 'body { overflow-x: visible; }' });
          assert.ok(
            (await page.evaluate(() => globalThis.document.documentElement.scrollWidth)) <=
              width + 1,
          );
          await page.emulateMediaType('print');
          assert.equal(
            await page.$eval(
              '.gh-table-scroll',
              (wrapper) => globalThis.getComputedStyle(wrapper).overflowX,
            ),
            'visible',
          );
          await page.emulateMediaType('screen');
          // Progressive CSS fallback on the original markup, with JS disabled.
          await page.setJavaScriptEnabled(false);
          await page.setContent(html);
          await page.evaluate(() => globalThis.document.fonts.ready);
          assert.ok(
            (await page.evaluate(() => globalThis.document.documentElement.scrollWidth)) <=
              width + 1,
            `${label}: no-JS overflow`,
          );
          assert.equal(await page.$$eval('.gh-table-scroll', (wrappers) => wrappers.length), 0);
        }
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}

const beforePath = join(artifacts, 'before.json');
if (!baseline && existsSync(beforePath)) {
  const before = JSON.parse(readFileSync(beforePath, 'utf8'));
  for (const result of results) {
    assert.deepEqual(
      result.blocks,
      before.find((row) => row.label === result.label).blocks,
      `${result.label}: short table, code, image or Koenig geometry changed`,
    );
  }
}

writeFileSync(
  join(artifacts, `${baseline ? 'before' : 'after'}.json`),
  JSON.stringify(results, null, 2),
);
console.log(baseline ? 'Baseline recorded' : 'Table checks passed');

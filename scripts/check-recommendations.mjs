// Against a running Ghost 6 with known recommendations, in helper order:
// GHOST_RECOMMENDATION_URLS='["https://example.com/","https://example.org/path/?a=1&b=2"]' npm run smoke:recommendations
// Use [] to verify an enabled but empty recommendation list.
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const baseUrl = process.env.GHOST_URL || 'http://localhost:2368';
const expected = JSON.parse(process.env.GHOST_RECOMMENDATION_URLS || 'null');
assert(Array.isArray(expected), 'Set GHOST_RECOMMENDATION_URLS to the ordered fixture URLs');
assert(expected.length === 0 || expected.length >= 2, 'Seed at least two recommendations');
expected.forEach((url) => assert.equal(new URL(url).protocol, 'https:'));

const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
try {
  for (const width of [1280, 390]) {
    for (const scheme of ['light', 'dark']) {
      const page = await browser.newPage();
      try {
        await page.setCacheEnabled(false);
        await page.setViewport({ width, height: 900 });
        await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
        await page.evaluateOnNewDocument((value) => {
          globalThis.localStorage.setItem('astrix-scheme', value);
        }, scheme);
        const response = await page.goto(baseUrl, { waitUntil: 'networkidle2' });
        assert.equal(response.status(), 200);
        const result = await page.evaluate(() => {
          const { document, getComputedStyle, window } = globalThis;
          const section = document.querySelector('.gh-footer-recommendations');
          return {
            sections: document.querySelectorAll('.gh-footer-recommendations').length,
            scheme: getComputedStyle(document.documentElement).colorScheme,
            links: [...document.querySelectorAll('.gh-recommendation-link')].map((link) => {
              const rect = link.getBoundingClientRect();
              link.focus();
              const style = getComputedStyle(link);
              return {
                href: link.getAttribute('href'),
                domain: link.querySelector('.gh-recommendation-url').textContent.trim(),
                tracking: link.dataset.recommendation,
                target: link.target,
                rel: link.rel,
                warning: link.querySelector('.u-visually-hidden')?.textContent.trim(),
                visible: rect.width > 0 && rect.height > 0,
                fitsViewport: rect.left >= 0 && rect.right <= window.innerWidth,
                focused: document.activeElement === link,
                outline: style.outlineStyle,
              };
            }),
            heading: section?.querySelector('h2')?.id,
            labelledBy: section?.getAttribute('aria-labelledby'),
          };
        });
        assert.equal(result.scheme, scheme);
        assert.equal(result.sections, expected.length ? 1 : 0);
        assert.deepEqual(
          result.links.map((link) => link.href),
          expected.slice(0, 4),
        );
        if (expected.length) assert.equal(result.labelledBy, result.heading);
        for (const link of result.links) {
          assert(link.domain.startsWith(new URL(link.href).hostname.replace(/^www\./, '')));
          assert(link.tracking);
          assert.equal(link.target, '_blank');
          assert(link.rel.split(' ').includes('noopener'));
          assert(link.warning);
          assert(link.visible && link.fitsViewport && link.focused);
          assert.notEqual(link.outline, 'none');
        }
        console.log(`recommendations: ${width}px ${scheme}, ${result.links.length} correct links`);
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}

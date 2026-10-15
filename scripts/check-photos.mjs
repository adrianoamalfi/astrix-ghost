/* global document */
/* Standalone browser check for the #photos slider: no Ghost server needed.
 * Runs the built main.js against markup shaped like partials/photo-slider.hbs.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import puppeteer from 'puppeteer';

const css = readFileSync('assets/built/screen.css', 'utf8');
const js = readFileSync('assets/built/main.js', 'utf8');
// 1x1 images, distinguishable by URL only
const px = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const attrs = `data-photo-slider data-label="Photo slider" data-prev-label="Previous photo"
  data-next-label="Next photo" data-status-label="Photo {current} of {total}"
  data-count-one="1 photo" data-count-other="% photos" data-title="Post"`;
const shell = (extra, feature, tail = '') => `
  <div class="gh-photo-media" ${attrs} ${extra}>
    <div class="gh-photo-track" data-photo-track>${
      feature || '<div class="gh-photo-fallback" data-photo-fallback><span>Post</span></div>'
    }</div>
    <div class="gh-photo-controls" data-photo-controls hidden>
      <button type="button" data-photo-prev>p</button>
      <span data-photo-status></span>
      <button type="button" data-photo-next>n</button>
    </div>${tail}
  </div>`;
const featureSlide = (key) =>
  `<div class="gh-photo-slide" data-photo-slide><img src="${px}" alt="" data-photo-key="${key}"></div>`;
const figure = (src, alt, cap = '') =>
  `<figure class="kg-card kg-image-card"><img src="${src}" alt="${alt}">${
    cap ? `<figcaption>${cap}</figcaption>` : ''
  }</figure>`;

const body = [
  figure('https://a.test/photo.jpg', 'Feature alt', 'Feature caption'),
  figure('https://b.test/photo.jpg', 'Other host'),
  figure('/content/images/size/w600/2024/x.jpg', 'Resized x', 'Cap x'),
  figure('/content/images/2024/x.jpg', 'Resized x', 'Cap x'),
  '<figure class="kg-card kg-bookmark-card"><img src="/thumb.jpg" alt=""></figure>',
  '<p>Text stays.</p>',
].join('');

const detail = `<article>
  <div class="gh-photo-detail">${shell('data-photo-detail', featureSlide('https://a.test/photo.jpg'))}
    <p data-photo-count hidden></p></div>
  <section id="gh-content">${body}</section></article>`;

const grid = (n) =>
  `<div class="gh-photo-grid"><article class="gh-photo-card">${shell(
    'data-href="/post/"',
    '',
    `<template data-photo-source>${Array.from({ length: n }, (_, i) =>
      figure(`https://a.test/p${i}.jpg`, `P${i}`),
    ).join('')}</template>`,
  )}<div class="gh-photo-body"><h3><a href="/post/">Post</a></h3><p data-photo-count hidden></p></div></article></div>`;

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

async function load(markup, width = 1280) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900 });
  await page.setContent(`<style>${css}</style>${markup}`);
  await page.addScriptTag({ content: js });
  return page;
}

try {
  // Post page: distinct images are kept, true duplicates folded, metadata kept
  let page = await load(detail);
  const slides = await page.$$eval('.gh-photo-slide', (nodes) =>
    nodes.map((n) => ({
      alt: n.querySelector('img').alt,
      caption: n.querySelector('.gh-photo-caption')?.textContent || '',
    })),
  );
  assert.deepEqual(slides, [
    { alt: 'Feature alt', caption: 'Feature caption' },
    { alt: 'Other host', caption: '' },
    { alt: 'Resized x', caption: 'Cap x' },
  ]);
  assert.equal(await page.$$eval('#gh-content figure', (n) => n.length), 1, 'bookmark stays');
  assert.match(await page.$eval('#gh-content', (n) => n.textContent), /Text stays/);
  assert.equal(await page.$eval('[data-photo-count]', (n) => n.textContent), '3 photos');
  await page.close();

  // Grid card: controls act on their own slider and never open the post
  page = await load(grid(3), 390);
  assert.equal(await page.$eval('[data-photo-controls]', (n) => n.hidden), false);
  assert.equal(await page.$eval('[data-photo-prev]', (n) => n.disabled), true);
  const urlBefore = page.url();
  assert.equal(await page.$eval('[data-photo-status]', (n) => n.textContent), 'Photo 1 of 3');
  await page.click('[data-photo-next]');
  await page.waitForFunction(
    () => document.querySelector('[data-photo-status]').textContent === 'Photo 2 of 3',
  );
  assert.equal(page.url(), urlBefore, 'controls do not navigate');
  await page.click('[data-photo-next]');
  await page.waitForFunction(() => document.querySelector('[data-photo-next]').disabled);
  assert.equal(await page.$eval('[data-photo-count]', (n) => n.textContent), '3 photos');
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
    true,
    'no horizontal page scroll',
  );
  await page.close();

  // Single image: no controls
  page = await load(grid(1), 390);
  assert.equal(await page.$eval('[data-photo-controls]', (n) => n.hidden), true);
  assert.equal(await page.$eval('[data-photo-count]', (n) => n.textContent), '1 photo');
  await page.close();

  console.log('photos: ok');
} finally {
  await browser.close();
}

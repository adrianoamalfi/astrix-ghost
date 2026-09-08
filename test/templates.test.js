import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import Handlebars from 'handlebars';

/*
 * Regression guard for v0.2.2, which shipped a broken default.hbs: a helper
 * call written inside a CSS comment in the <style> block. Handlebars parses
 * .hbs files in full and knows nothing about CSS comments, so `{{asset}}` was
 * evaluated with no argument and Ghost threw "assetPath.match is not a
 * function" on every page. gscan compiles templates but never invokes helpers,
 * so nothing in the quality gate caught it.
 */

const IGNORED_DIRS = /^(node_modules|\.git|dist|demo|docs)$/;

function findTemplates(dir = '.', out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_DIRS.test(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) findTemplates(full, out);
    else if (entry.name.endsWith('.hbs')) out.push(full);
  }
  return out;
}

const templates = findTemplates();

function readCssTree(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) readCssTree(full, out);
    else if (entry.name.endsWith('.css')) out.push(readFileSync(full, 'utf8'));
  }
  return out;
}

describe('Handlebars expressions in CSS/JS comments', () => {
  // Handlebars comments ({{!-- --}}) are stripped before rendering, so a helper
  // call inside one is inert. A CSS or JS comment is not — it still renders.
  const stripHandlebarsComments = (src) =>
    src
      .replace(/\{\{!--[\s\S]*?--\}\}/g, (m) => m.replace(/[^\n]/g, ' '))
      .replace(/\{\{![\s\S]*?\}\}/g, (m) => m.replace(/[^\n]/g, ' '));

  it.each(templates)('%s has no helper call inside a CSS/JS comment', (file) => {
    const stripped = stripHandlebarsComments(readFileSync(file, 'utf8'));
    const offenders = [];
    for (const comment of stripped.matchAll(/\/\*[\s\S]*?\*\//g)) {
      for (const expr of comment[0].matchAll(/\{\{[^}]*\}\}/g)) offenders.push(expr[0]);
    }
    expect(offenders).toEqual([]);
  });
});

describe('head-preload mirrors the rendered image candidate', () => {
  // partials/head-preload.hbs hand-copies the srcset/sizes of every LCP image
  // across the post / page / author / tag / home render paths. If a preload
  // and the <source> it mirrors drift apart, the browser downloads the image
  // twice instead of saving a round trip — invisible to gscan and to the
  // render tests, and it has already cost a release (v0.2.4 "correct the LCP
  // preload"). This asserts every preload has an exactly matching AVIF
  // <source> somewhere in the render templates.
  //
  // "Shape" = the ordered list of `<size>:<width>` pairs, ignoring which image
  // variable is passed; "sizes" = the media-query list, whitespace-collapsed.
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const shapeOf = (srcset) =>
    [...srcset.matchAll(/img_url\s+[\w@.]+\s+size="(\w+)"\s+format="avif"\s*\}\}\s+(\d+w)/g)]
      .map((m) => `${m[1]}:${m[2]}`)
      .join(',');

  const preload = readFileSync('partials/head-preload.hbs', 'utf8');
  const preloads = [...preload.matchAll(/imagesrcset="([\s\S]*?)"\s+imagesizes="([\s\S]*?)"/g)].map(
    (m) => ({ shape: shapeOf(m[1]), sizes: norm(m[2]) }),
  );

  // srcset/sizes values contain nested double-quotes ({{img_url x size="m"}}),
  // so anchor each closing quote on what follows it rather than the first ".
  const attrPair = /srcset="([\s\S]*?)"\s+sizes="([\s\S]*?)"\s*>/;

  const rendered = new Set();
  for (const file of templates) {
    if (file.includes('head-preload')) continue;
    for (const tag of readFileSync(file, 'utf8').matchAll(/<source\b[\s\S]*?>/g)) {
      if (!/type="image\/avif"/.test(tag[0])) continue;
      const m = tag[0].match(attrPair);
      if (m) rendered.add(`${shapeOf(m[1])}|${norm(m[2])}`);
    }
  }

  it('every head-preload link has candidates to mirror', () => {
    expect(preloads.length).toBeGreaterThan(0);
  });

  it.each(preloads)('preload %o matches a rendered <source>', ({ shape, sizes }) => {
    expect(shape).not.toBe('');
    expect([...rendered]).toContain(`${shape}|${sizes}`);
  });
});

describe('data-astryx-* attributes are all styled', () => {
  // Every data-astryx-* hook a template emits must be selected by at least one
  // rule in assets/css/ (theme or vendored Astryx). An attribute nothing
  // styles is dead weight on every page and misleads a reader into thinking
  // an Astryx component sits behind it — the theme only consumes the tokens.
  const css = readCssTree('assets/css').join('\n');
  const used = new Set();
  for (const file of templates) {
    for (const m of readFileSync(file, 'utf8').matchAll(/data-astryx-([a-z-]+)/g)) {
      used.add(m[1]);
    }
  }

  it.each([...used])('data-astryx-%s has a CSS selector', (name) => {
    expect(css).toMatch(new RegExp(`\\[data-astryx-${name}[\\]=~*|^$]`));
  });
});

describe('templates render without invoking helpers incorrectly', () => {
  function makeHandlebars() {
    const hbs = Handlebars.create();
    // Mirrors Ghost's asset helper, which calls assetPath.match(...) and so
    // throws exactly like production when handed a non-string.
    hbs.registerHelper('asset', (assetPath) => {
      if (typeof assetPath !== 'string') {
        throw new TypeError('assetPath.match is not a function');
      }
      return new hbs.SafeString(`/assets/${assetPath}?v=test`);
    });

    const blockHelper = function (...args) {
      const options = args[args.length - 1];
      return options && typeof options.fn === 'function' ? options.fn(this) : '';
    };
    for (const name of [
      'is',
      'match',
      'has',
      'foreach',
      'get',
      'post',
      'page',
      'primary_author',
      'primary_tag',
      'author',
      'tags',
      'navigation_item',
    ]) {
      hbs.registerHelper(name, blockHelper);
    }
    for (const name of [
      'meta_title',
      'meta_description',
      'body_class',
      'ghost_head',
      'ghost_foot',
      't',
      'img_url',
      'date',
      'reading_time',
      'excerpt',
      'url',
      'title',
      'content',
      'pagination',
      'navigation',
      'post_class',
      'lang',
      'price',
      'tiers',
    ]) {
      hbs.registerHelper(name, () => '');
    }
    // Partials are exercised on their own; stub them so each file is isolated.
    for (const file of templates) {
      const name = file.replace(/^partials\//, '').replace(/\.hbs$/, '');
      hbs.registerPartial(name, '');
    }
    return hbs;
  }

  // Stubbing Ghost's full data shape is out of scope, so a template may still
  // fail on missing fixture data ("Cannot read properties of undefined"). That
  // is noise. What must never happen is a helper being *invoked wrongly* — the
  // v0.2.2 failure mode — which surfaces as a TypeError of the "x is not a
  // function" kind. Only that class fails the test.
  it.each(templates)('%s never invokes a helper with a bad argument', (file) => {
    const hbs = makeHandlebars();
    const render = hbs.compile(readFileSync(file, 'utf8'));
    let helperMisuse = null;
    try {
      render({ '@site': { url: 'https://example.com', title: 'Test' } });
    } catch (err) {
      if (/is not a function/.test(err.message)) helperMisuse = err.message;
    }
    expect(helperMisuse).toBeNull();
  });
});

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

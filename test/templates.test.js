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

  hbs.registerHelper('is', function (context, options) {
    return options.data.root._context === context ? options.fn(this) : options.inverse(this);
  });

  const contextBlockHelper = function (name) {
    return function (options) {
      const value = this[name];
      return value ? options.fn(value) : options.inverse(this);
    };
  };

  hbs.registerHelper('primary_tag', contextBlockHelper('primary_tag'));
  hbs.registerHelper('primary_author', contextBlockHelper('primary_author'));
  hbs.registerHelper('author', contextBlockHelper('author'));
  hbs.registerHelper('post', contextBlockHelper('post'));
  hbs.registerHelper('page', contextBlockHelper('page'));
  hbs.registerHelper('navigation_item', contextBlockHelper('navigation_item'));

  const passthroughBlockHelper = function (...args) {
    const options = args[args.length - 1];
    return options && typeof options.fn === 'function' ? options.fn(this) : '';
  };
  for (const name of ['match', 'has', 'foreach', 'get', 'tags']) {
    hbs.registerHelper(name, passthroughBlockHelper);
  }

  hbs.registerHelper('t', (value) => value);
  hbs.registerHelper('url', function (options) {
    const siteUrl = options.data.root['@site'].url;
    if (options.hash.absolute && this.url?.startsWith('/')) return `${siteUrl}${this.url}`;
    return this.url || siteUrl;
  });

  for (const name of [
    'meta_title',
    'meta_description',
    'body_class',
    'ghost_head',
    'ghost_foot',
    'img_url',
    'date',
    'reading_time',
    'excerpt',
    'content',
    'pagination',
    'navigation',
    'recommendations',
    'readable_url',
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

describe('breadcrumbs SEO coverage', () => {
  const breadcrumbs = readFileSync('partials/breadcrumbs.hbs', 'utf8');
  const postTemplate = readFileSync('post.hbs', 'utf8');
  const specialTitle = `Mario's "blog" & Back\\slash`;

  const decodeHtml = (value) =>
    value
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');

  function renderBreadcrumbs(context, data = {}) {
    const hbs = makeHandlebars();
    return hbs.compile(breadcrumbs)({
      _context: context,
      '@site': { url: 'https://example.com', title: 'Test' },
      url: `/${context}/special/`,
      ...data,
    });
  }

  function microdataNames(html) {
    return [...html.matchAll(/<span itemprop="name">([\s\S]*?)<\/span>/g)].map((m) =>
      decodeHtml(m[1]),
    );
  }

  it('post template includes the breadcrumbs partial', () => {
    expect(postTemplate).toContain('{{> "breadcrumbs"}}');
  });

  it.each(['post', 'page', 'tag', 'author'])(
    '%s context emits BreadcrumbList microdata',
    (context) => {
      expect(breadcrumbs).toContain(`{{#is "${context}"}}`);
      expect(breadcrumbs).toContain('itemscope itemtype="https://schema.org/BreadcrumbList"');
    },
  );

  it.each([
    {
      label: 'post with primary tag',
      context: 'post',
      data: {
        title: specialTitle,
        primary_tag: { name: specialTitle, url: '/tag/special/' },
      },
      expected: ['Home', specialTitle, specialTitle],
    },
    {
      label: 'post without primary tag',
      context: 'post',
      data: { title: specialTitle },
      expected: ['Home', specialTitle],
    },
    {
      label: 'page',
      context: 'page',
      data: { title: specialTitle },
      expected: ['Home', specialTitle],
    },
    {
      label: 'tag',
      context: 'tag',
      data: { name: specialTitle },
      expected: ['Home', specialTitle],
    },
    {
      label: 'author',
      context: 'author',
      data: { name: specialTitle },
      expected: ['Home', specialTitle],
    },
  ])(
    '$label preserves special characters in rendered microdata names',
    ({ context, data, expected }) => {
      const html = renderBreadcrumbs(context, data);
      expect(microdataNames(html)).toEqual(expected);
      expect(html).not.toContain('<script type="application/ld+json">');
    },
  );
});

describe('templates render without invoking helpers incorrectly', () => {
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

describe('site footer credits', () => {
  function renderFooter() {
    const hbs = makeHandlebars();
    return hbs.compile(readFileSync('partials/site-footer.hbs', 'utf8'))({
      '@site': {
        url: 'https://example.com',
        title: 'Astrix Test',
      },
    });
  }

  it('separates credit link text from the visually hidden new-tab warning', () => {
    const html = renderFooter();

    expect(html).toMatch(
      /<a href="https:\/\/adrianoamalfi\.com\/astrix\/" target="_blank" rel="noopener noreferrer">Astrix <span class="u-visually-hidden">Opens in a new tab<\/span><\/a>/,
    );
    expect(html).toMatch(
      /<a href="https:\/\/ghost\.org" target="_blank" rel="noopener noreferrer">Ghost <span class="u-visually-hidden">Opens in a new tab<\/span><\/a>/,
    );
  });
});

describe('footer recommendations partial', () => {
  function recommendationsHandlebars() {
    const hbs = Handlebars.create();
    hbs.registerHelper('t', (key) => key);
    hbs.registerHelper('readable_url', (url) => new URL(url).hostname);
    hbs.registerHelper('foreach', hbs.helpers.each);
    // Ghost's url helper resolves a recommendation (neither post nor tag nor
    // author) to the publication root. Register that behaviour so {{url}}
    // really collides with the property, unlike the old helper-free fixture.
    hbs.registerHelper('url', () => new hbs.SafeString('/'));
    return hbs;
  }

  function renderRecommendations(recommendations) {
    const hbs = recommendationsHandlebars();
    return hbs.compile(readFileSync('partials/recommendations.hbs', 'utf8'))({ recommendations });
  }

  it('reproduces the helper collision that sent external links to the homepage', () => {
    const hbs = recommendationsHandlebars();
    const html = hbs.compile(
      '{{#foreach recommendations}}<a href="{{url}}">{{readable_url url}}</a>{{/foreach}}',
    )({
      recommendations: [{ url: 'https://diariodiunanalista.it/' }],
    });

    expect(html).toBe('<a href="/">diariodiunanalista.it</a>');
  });

  it('uses each recommendation URL including paths, query strings and fragments', () => {
    const html = renderRecommendations([
      { id: 'rec-1', title: 'Analista', url: 'https://diariodiunanalista.it/' },
      { id: 'rec-2', title: 'Pomaro', url: 'https://alessiopomaro.it/articles/?a=1&b=two#section' },
    ]);

    expect(html).toContain('href="https://diariodiunanalista.it/" data-recommendation="rec-1"');
    expect(html).toContain(
      'href="https://alessiopomaro.it/articles/?a&#x3D;1&amp;b&#x3D;two#section" data-recommendation="rec-2"',
    );
    expect(html).not.toContain('href="/"');
    expect(html).toContain('>diariodiunanalista.it</span>');
    expect(html).toContain('>alessiopomaro.it</span>');
    expect(readFileSync('partials/site-footer.hbs', 'utf8')).toContain(
      '{{recommendations limit="4"}}',
    );
  });

  it('escapes recommendation attributes and text', () => {
    const html = renderRecommendations([
      {
        id: 'rec-"quoted"',
        url: 'https://example.com/?q="quoted"&page=2',
        title: '<script>alert("title")</script>',
        description: '<img src=x onerror="alert(1)">',
        favicon: 'https://example.com/icon.png?q="quoted"',
      },
    ]);

    expect(html).toContain('href="https://example.com/?q&#x3D;&quot;quoted&quot;&amp;page&#x3D;2"');
    expect(html).toContain('data-recommendation="rec-&quot;quoted&quot;"');
    expect(html).toContain('src="https://example.com/icon.png?q&#x3D;&quot;quoted&quot;"');
    expect(html).toContain('&lt;script&gt;alert(&quot;title&quot;)&lt;/script&gt;');
    expect(html).toContain('&lt;img src&#x3D;x onerror&#x3D;&quot;alert(1)&quot;&gt;');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
  });

  it('renders nothing when Ghost returns no recommendations', () => {
    const html = renderRecommendations([]);

    expect(html.trim()).toBe('');
    expect(html).not.toContain('gh-footer-recommendations');
    expect(html).not.toContain('Recommended sites');
  });

  it('renders the section and list when recommendations exist', () => {
    const html = renderRecommendations([
      {
        id: 'rec-1',
        title: 'Example Journal',
        url: 'https://example.com/',
        favicon: 'https://example.com/favicon.ico',
        description: 'Independent notes from the web.',
      },
      {
        id: 'rec-2',
        title: 'No Icon Weekly',
        url: 'https://weekly.example/',
      },
    ]);

    expect(html).toContain('class="gh-footer-recommendations"');
    expect(html).toContain('Recommended sites');
    expect(html).toContain('class="recommendations gh-recommendations-list"');
    expect(html).toContain('Example Journal');
    expect(html).toContain('No Icon Weekly');
    expect(html).toContain('https://example.com/favicon.ico');
  });

  it('includes a visually hidden new-tab warning inside each recommendation link', () => {
    const html = renderRecommendations([
      {
        id: 'rec-1',
        title: 'Example Journal',
        url: 'https://example.com/',
      },
    ]);

    expect(html).toMatch(
      /<a class="gh-recommendation-link" href="https:\/\/example\.com\/" data-recommendation="rec-1" target="_blank" rel="noopener">[\s\S]*<span class="u-visually-hidden">Opens in a new tab<\/span>[\s\S]*<\/a>/,
    );
  });
});

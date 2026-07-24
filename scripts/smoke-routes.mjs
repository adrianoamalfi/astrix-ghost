const baseUrl = process.env.GHOST_URL || 'http://localhost:2368';

const routes = [
  { path: '/', expected: 200, name: 'home' },
  { path: '/tag/design/', expected: 200, name: 'tag' },
  { path: '/author/adriano/', expected: 200, name: 'author' },
  { path: '/about/', expected: 200, name: 'page' },
  { path: '/kitchen-sink-tutte-le-card-koenig/', expected: 200, name: 'post' },
  { path: '/post-riservato-agli-iscritti/', expected: 200, name: 'gated post' },
  { path: '/404-not-found-test/', expected: 404, name: '404' },
];

const requiredMarkup = [
  ['built CSS', '/assets/built/screen.css'],
  ['built JS', '/assets/built/main.js'],
  ['skip target', 'id="gh-main-content"'],
  ['header', 'id="gh-header"'],
];

function fail(message) {
  console.error(`smoke: ${message}`);
  process.exitCode = 1;
}

const collapse = (value) => value.replace(/\s+/g, ' ').trim();

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}="([\\s\\S]*?)"`));
  return match ? collapse(match[1]) : null;
}

/*
 * An LCP preload only helps if it names the exact candidate the page paints.
 * Get the srcset or sizes wrong and the browser downloads a second image
 * instead of reusing the preloaded one — worse than no preload at all. This
 * compares the <link rel=preload as=image> against the first AVIF <source>,
 * which is the element the preload is meant to mirror. Only a live render
 * catches a mismatch, which is why it lives here and not in the unit tests.
 */
function checkPreloadMatchesRender(name, path, html) {
  const preloads = html.match(/<link rel="preload" as="image"[\s\S]*?>/g) || [];
  if (preloads.length === 0) return;

  if (preloads.length > 1) {
    fail(`${name} ${path} emits ${preloads.length} image preloads, expected at most 1`);
    return;
  }

  const source = (html.match(/<source type="image\/avif"[\s\S]*?>/) || [])[0];
  if (!source) {
    fail(`${name} ${path} preloads an image but renders no AVIF source to match it`);
    return;
  }

  for (const [preloadAttr, renderAttr] of [
    ['imagesrcset', 'srcset'],
    ['imagesizes', 'sizes'],
  ]) {
    const preloaded = attr(preloads[0], preloadAttr);
    const rendered = attr(source, renderAttr);
    if (preloaded !== rendered) {
      fail(
        `${name} ${path} preload ${preloadAttr} does not match the rendered ${renderAttr}\n` +
          `    preload: ${preloaded}\n` +
          `    render : ${rendered}`,
      );
    }
  }
}

for (const route of routes) {
  const url = new URL(route.path, baseUrl);
  let response;
  let html;

  try {
    response = await fetch(url);
    html = await response.text();
  } catch (error) {
    fail(`${route.name} ${route.path} unavailable: ${error.message}`);
    continue;
  }

  if (response.status !== route.expected) {
    fail(`${route.name} ${route.path} status ${response.status}, expected ${route.expected}`);
    continue;
  }

  if (/<html[^>]*>/.test(html) === false) {
    fail(`${route.name} ${route.path} did not return HTML`);
  }

  if (/Unhandled|SyntaxError|Trace|ghost-error/.test(html)) {
    fail(`${route.name} ${route.path} contains an error marker`);
  }

  if (route.expected === 200) {
    for (const [label, needle] of requiredMarkup) {
      if (!html.includes(needle)) {
        fail(`${route.name} ${route.path} missing ${label}`);
      }
    }
    checkPreloadMatchesRender(route.name, route.path, html);
  }

  console.log(`smoke: ${route.name} ${route.path} ${response.status}`);
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(`smoke: ok ${baseUrl}`);

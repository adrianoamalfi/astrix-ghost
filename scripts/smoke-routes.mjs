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
  }

  console.log(`smoke: ${route.name} ${route.path} ${response.status}`);
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(`smoke: ok ${baseUrl}`);

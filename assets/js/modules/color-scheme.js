/*
 * Three-state color scheme toggle: light → dark → system.
 * All Astryx color tokens use light-dark(), so switching scheme is just
 * setting `color-scheme` on <html>; "system" removes the inline style and
 * falls back to the stylesheet's `color-scheme: light dark`.
 */
const STORAGE_KEY = 'astrix-scheme';
const SCHEMES = new Set(['light', 'dark', 'system']);

function systemScheme() {
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function apply(scheme) {
  const html = document.documentElement;
  if (scheme === 'dark' || scheme === 'light') {
    html.style.colorScheme = scheme;
  } else {
    html.style.colorScheme = '';
  }
  // Mirror the *effective* scheme for CSS (toggle icon) and embeds.
  html.dataset.scheme = scheme === 'system' ? systemScheme() : scheme;
}

function stored() {
  try {
    return normalize(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function normalize(scheme) {
  const value = String(scheme || '').toLowerCase();
  return SCHEMES.has(value) ? value : null;
}

function store(scheme) {
  try {
    if (scheme === 'system') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, scheme);
    }
  } catch {
    /* storage unavailable */
  }
}

export function initColorScheme() {
  const html = document.documentElement;
  const defaultScheme = normalize(html.getAttribute('data-scheme-default')) || 'system';
  let current = stored() || defaultScheme;
  apply(current);

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (current === 'system') apply('system');
  });

  const button = document.getElementById('gh-scheme-toggle');
  if (!button) return;

  const updateLabel = () => {
    const label = button.getAttribute(`data-label-${current}`) || button.getAttribute('aria-label');
    button.setAttribute('aria-label', label);
    button.title = label;
  };
  updateLabel();

  button.addEventListener('click', () => {
    if (current === 'system') {
      current = 'light';
    } else if (current === 'light') {
      current = 'dark';
    } else {
      current = 'system';
    }
    store(current);
    apply(current);
    updateLabel();
  });
}

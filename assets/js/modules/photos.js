/*
 * Photos: slider for photo cards (grid index) and the photo post page.
 *
 * The server renders the feature image as the first slide. The images of the
 * post body are read from the already access-checked content (a <template> on
 * the grid, the article body on the post page), so nothing reserved is ever
 * added here. On the post page the images moved into the slider are removed
 * from the body. Controls appear only with two or more slides. Touch and
 * wheel scrolling are native (scroll-snap); the buttons and arrow keys scroll
 * the same track.
 */
const IMAGE_SELECTOR = '.kg-image-card img, .kg-gallery-image img';

// Same image at a different Ghost size or query string counts as one
export function imageKey(src) {
  return (src || '')
    .replace(/[?#].*$/, '')
    .replace(/\/size\/w\d+(h\d+)?(\/format\/[a-z]+)?\//, '/')
    .replace(/^https?:\/\/[^/]+/, '');
}

function captionOf(img) {
  const figure = img.closest('figure.kg-image-card');
  const caption = figure && figure.querySelector(':scope > figcaption');
  return caption ? caption.innerHTML : '';
}

// Ordered, de-duplicated image data. `seen` holds keys already in the slider.
export function extractImages(root, seen = new Set()) {
  const found = [];
  for (const img of root.querySelectorAll(IMAGE_SELECTOR)) {
    const key = imageKey(img.getAttribute('src'));
    const duplicate = !key || seen.has(key);
    if (!duplicate) seen.add(key);
    found.push({
      node: img,
      duplicate,
      src: img.getAttribute('src'),
      srcset: img.getAttribute('srcset') || '',
      alt: img.getAttribute('alt') || '',
      width: img.getAttribute('width'),
      height: img.getAttribute('height'),
      caption: captionOf(img),
    });
  }
  return found.filter((item) => item.src);
}

function buildSlide(item, root) {
  const slide = document.createElement('div');
  slide.className = 'gh-photo-slide';
  slide.dataset.photoSlide = '';

  const img = document.createElement('img');
  img.src = item.src;
  if (item.srcset) img.srcset = item.srcset;
  img.sizes = root.hasAttribute('data-photo-detail')
    ? '(max-width: 1200px) 100vw, 1200px'
    : '(max-width: 640px) 100vw, 50vw';
  img.alt = item.alt;
  if (item.width) img.width = item.width;
  if (item.height) img.height = item.height;
  img.loading = 'lazy';
  img.decoding = 'async';

  const href = root.dataset.href;
  if (href) {
    const link = document.createElement('a');
    link.className = 'gh-photo-slide-link';
    link.href = href;
    if (!item.alt) link.setAttribute('aria-label', root.dataset.title || '');
    link.append(img);
    slide.append(link);
  } else {
    slide.append(img);
  }

  if (item.caption) {
    const caption = document.createElement('span');
    caption.className = 'gh-photo-caption';
    caption.innerHTML = item.caption;
    slide.append(caption);
  }
  return slide;
}

// Take the moved images out of the post body, with their emptied card
function removeFromBody(item) {
  const card = item.node.closest('.kg-gallery-card, .kg-image-card');
  const target = item.node.closest('.kg-gallery-image') || card;
  if (target) target.remove();
  if (card && card.matches('.kg-gallery-card')) {
    const hasCaption = card.querySelector(':scope > figcaption');
    if (!card.querySelector('img') && !hasCaption) card.remove();
  }
}

function countLabel(root, total) {
  return total === 1 ? root.dataset.countOne : root.dataset.countOther.replace('%', total);
}

function setupControls(root, track, slides) {
  const controls = root.querySelector('[data-photo-controls]');
  const prev = root.querySelector('[data-photo-prev]');
  const next = root.querySelector('[data-photo-next]');
  const status = root.querySelector('[data-photo-status]');
  if (!controls || !prev || !next) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const current = () => Math.round(track.scrollLeft / (track.clientWidth || 1));

  function update() {
    const index = Math.min(Math.max(current(), 0), slides.length - 1);
    prev.disabled = index === 0;
    next.disabled = index === slides.length - 1;
    status.textContent = root.dataset.statusLabel
      .replace('{current}', index + 1)
      .replace('{total}', slides.length);
  }

  function go(delta) {
    const index = Math.min(Math.max(current() + delta, 0), slides.length - 1);
    track.scrollTo({
      left: index * track.clientWidth,
      behavior: reduced.matches ? 'auto' : 'smooth',
    });
  }

  let frame = 0;
  track.addEventListener(
    'scroll',
    () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    },
    { passive: true },
  );
  window.addEventListener('resize', update);
  prev.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));
  track.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    go(event.key === 'ArrowRight' ? 1 : -1);
  });

  track.tabIndex = 0;
  track.setAttribute('role', 'group');
  track.setAttribute('aria-roledescription', 'carousel');
  track.setAttribute('aria-label', root.dataset.label || '');
  controls.hidden = false;
  update();
}

function initSlider(root) {
  const track = root.querySelector('[data-photo-track]');
  if (!track) return;

  const detail = root.hasAttribute('data-photo-detail');
  const source = detail
    ? document.getElementById('gh-content')
    : root.querySelector('template[data-photo-source]')?.content;

  const seen = new Set();
  for (const img of track.querySelectorAll('[data-photo-key]')) {
    seen.add(imageKey(img.dataset.photoKey));
  }

  const items = source ? extractImages(source, seen) : [];
  const fresh = items.filter((item) => !item.duplicate);
  if (fresh.length) {
    track.querySelector('[data-photo-fallback]')?.remove();
    for (const item of fresh) track.append(buildSlide(item, root));
  }
  // A body copy of an image now in the slider (or of the feature image) goes
  if (detail) for (const item of items) removeFromBody(item);

  const slides = [...track.querySelectorAll('[data-photo-slide]')];
  const count = root.parentElement.querySelector('[data-photo-count]');
  if (count && slides.length) {
    count.textContent = countLabel(root, slides.length);
    count.hidden = false;
  }
  if (slides.length > 1) setupControls(root, track, slides);
}

export function initPhotos() {
  document.querySelectorAll('[data-photo-slider]').forEach(initSlider);
}

/*
 * Lightweight image lightbox for content images and Koenig galleries.
 * No dependencies. Images in the same gallery card form a group with
 * prev/next; standalone images open on their own. Keyboard: Esc closes,
 * arrows navigate; focus returns to the trigger on close.
 */
const CLOSE_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
const PREV_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
const NEXT_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';

export function initLightbox() {
  const contents = Array.from(document.querySelectorAll('.gh-content'));
  if (!contents.length) return;

  const images = [];
  contents.forEach((content) => {
    content
      .querySelectorAll('.kg-image-card img, .kg-gallery-image img, figure.kg-card img')
      .forEach((img) => {
        if (img.closest('a')) return; // already links somewhere
        images.push(img);
      });
  });
  if (!images.length) return;

  const labels = contents[0].dataset;
  const zoomLabel = labels.zoomLabel || 'Zoom image';
  const closeLabel = labels.closeLabel || 'Close';
  const prevLabel = labels.prevLabel || 'Previous';
  const nextLabel = labels.nextLabel || 'Next';

  // Group by nearest gallery card; standalone images are their own group.
  const groups = new Map();
  images.forEach((img) => {
    const gallery = img.closest('.kg-gallery-card') || img;
    if (!groups.has(gallery)) groups.set(gallery, []);
    img.dataset.lbGroup = groups.size;
    groups.get(gallery).push(img);
  });

  images.forEach((img) => {
    img.classList.add('gh-zoomable');
    img.setAttribute('role', 'button');
    img.setAttribute('tabindex', '0');
    img.setAttribute('aria-label', zoomLabel);
    img.addEventListener('click', () => open(img));
    img.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open(img);
      }
    });
  });

  // Overlay, built once.
  const overlay = document.createElement('div');
  overlay.className = 'gh-lightbox';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.hidden = true;
  overlay.innerHTML = `
    <button type="button" class="gh-lightbox-close" aria-label="${closeLabel}">${CLOSE_ICON}</button>
    <button type="button" class="gh-lightbox-nav gh-lightbox-prev" aria-label="${prevLabel}">${PREV_ICON}</button>
    <figure class="gh-lightbox-figure"><img alt=""><figcaption></figcaption></figure>
    <button type="button" class="gh-lightbox-nav gh-lightbox-next" aria-label="${nextLabel}">${NEXT_ICON}</button>`;
  document.body.appendChild(overlay);

  const bigImg = overlay.querySelector('img');
  const caption = overlay.querySelector('figcaption');
  const closeBtn = overlay.querySelector('.gh-lightbox-close');
  const prevBtn = overlay.querySelector('.gh-lightbox-prev');
  const nextBtn = overlay.querySelector('.gh-lightbox-next');

  let group = [];
  let index = 0;
  let trigger = null;

  function render() {
    const img = group[index];
    bigImg.src = img.currentSrc || img.src;
    const cap = img.getAttribute('alt') || '';
    caption.textContent = cap;
    caption.hidden = !cap;
    const many = group.length > 1;
    prevBtn.hidden = !many;
    nextBtn.hidden = !many;
  }

  function open(img) {
    const groupId = img.dataset.lbGroup;
    group = images.filter((i) => i.dataset.lbGroup === groupId);
    index = group.indexOf(img);
    trigger = img;
    render();
    overlay.hidden = false;
    document.body.classList.add('has-lightbox-open');
    closeBtn.focus();
  }

  function close() {
    overlay.hidden = true;
    document.body.classList.remove('has-lightbox-open');
    if (trigger) trigger.focus();
  }

  function step(delta) {
    if (group.length < 2) return;
    index = (index + delta + group.length) % group.length;
    render();
  }

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', () => step(-1));
  nextBtn.addEventListener('click', () => step(1));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // Horizontal swipe navigates the gallery on touch devices.
  let touchStartX = 0;
  let touchStartY = 0;
  overlay.addEventListener(
    'touchstart',
    (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    },
    { passive: true },
  );
  overlay.addEventListener(
    'touchend',
    (e) => {
      const dx = e.changedTouches[0].screenX - touchStartX;
      const dy = e.changedTouches[0].screenY - touchStartY;
      // Only treat mostly-horizontal moves past a threshold as swipes, so
      // vertical scrolls and taps (which close via the click handler) are left alone.
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
    },
    { passive: true },
  );

  document.addEventListener('keydown', (e) => {
    if (overlay.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'Tab') {
      // Focus trap across the visible overlay buttons.
      const focusables = [closeBtn, prevBtn, nextBtn].filter((b) => !b.hidden);
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}

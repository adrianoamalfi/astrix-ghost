/*
 * Builds the table of contents from .gh-content h2/h3 into the #gh-toc
 * shell, with an IntersectionObserver scrollspy. Hidden below 2 headings.
 */
import { slugify, safeDecode } from './utils.js';

export function initToc() {
  const toc = document.getElementById('gh-toc');
  const details = document.getElementById('gh-toc-details');
  const content = document.getElementById('gh-content');
  if (!toc || !details || !content) return;

  // Koenig widget cards embed their own headings (signup form, product,
  // toggle) that are UI chrome, not article structure — keep them out of
  // the outline. Header cards stay: their heading is an intentional section.
  const EXCLUDE_CARDS = '.kg-signup-card, .kg-product-card, .kg-toggle-card';
  const headings = Array.from(content.querySelectorAll('h2, h3')).filter(
    (heading) => !heading.closest(EXCLUDE_CARDS),
  );
  if (headings.length < 2) {
    const column = toc.closest('.gh-toc-column');
    if (column) column.hidden = true;
    const layout = document.getElementById('gh-article-layout');
    if (layout) layout.classList.remove('has-toc');
    return;
  }

  const list = toc.querySelector('.gh-toc-list');
  const seen = new Set();
  let currentH2Item = null;

  const uniqueHeadingId = (heading) => {
    const base = heading.id || slugify(heading.textContent) || 'section';
    let id = base;
    while (
      seen.has(id) ||
      (document.getElementById(id) && document.getElementById(id) !== heading)
    ) {
      id += '-x';
    }
    seen.add(id);
    return id;
  };

  headings.forEach((heading) => {
    heading.id = uniqueHeadingId(heading);

    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#${heading.id}`;
    link.textContent = heading.textContent;
    item.appendChild(link);

    if (heading.tagName === 'H3' && currentH2Item) {
      let sublist = currentH2Item.querySelector(':scope > ol');
      if (!sublist) {
        sublist = document.createElement('ol');
        currentH2Item.appendChild(sublist);
      }
      sublist.appendChild(item);
    } else {
      list.appendChild(item);
      if (heading.tagName === 'H2') currentH2Item = item;
    }
  });

  details.hidden = false;

  // Open in the desktop sidebar; closed (reader-toggleable) above the
  // article on smaller screens, where an 8-entry index would push the
  // first paragraph below the fold.
  const desktop = matchMedia('(min-width: 1200px)');
  const syncOpen = () => {
    details.open = desktop.matches;
  };
  syncOpen();
  desktop.addEventListener('change', syncOpen);

  // After a jump on mobile, collapse so the reader lands on the section
  list.addEventListener('click', (event) => {
    if (event.target.closest('a') && !desktop.matches) details.open = false;
  });

  // Scrollspy — reading-line model: the active entry is the last heading
  // above the line just under the sticky header, recomputed on scroll (same
  // rAF-throttled pattern as progress.js). An IntersectionObserver band
  // can't do this: it never demotes an entry when scrolling back up, so the
  // highlight lagged one section behind on upward reads.
  const links = new Map(
    Array.from(toc.querySelectorAll('a')).map((a) => [safeDecode(a.hash.slice(1)), a]),
  );
  let activeLink = null;

  const setActive = (link) => {
    if (link === activeLink) return;
    if (activeLink) {
      activeLink.classList.remove('is-active');
      activeLink.removeAttribute('aria-current');
    }
    if (link) {
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'location');
    }
    activeLink = link;
  };

  const headerHeight =
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gh-header-height')) ||
    64;
  // just past the anchors' scroll-margin-top, so a TOC jump lands "inside" its own section
  const readingLine = headerHeight + 24;

  let ticking = false;
  const update = () => {
    ticking = false;
    let current = null;
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= readingLine) current = heading;
      else break;
    }
    setActive(current ? links.get(current.id) : null);
  };

  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  update();
}

/*
 * Adds hover-revealed permalink anchors to content headings. Reuses the
 * ids assigned by the table of contents when present, and copies the full
 * section URL to the clipboard on click.
 */
import { slugify } from './utils.js';

const LINK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';

export function initHeadingAnchors() {
  document.querySelectorAll('.gh-content').forEach((content) => {
    const label = content.dataset.anchorLabel || 'Copy link to this section';
    const copiedLabel = content.dataset.anchorCopiedLabel || 'Copied';
    const headings = content.querySelectorAll('h2, h3');
    const seen = new Set();

    headings.forEach((heading) => {
      if (!heading.id) {
        let id = slugify(heading.textContent) || 'section';
        while (seen.has(id) || document.getElementById(id)) id += '-x';
        heading.id = id;
      }
      seen.add(heading.id);

      const anchor = document.createElement('a');
      anchor.className = 'gh-heading-anchor';
      anchor.href = `#${heading.id}`;
      anchor.setAttribute('aria-label', label);
      anchor.innerHTML = LINK_ICON;
      heading.appendChild(anchor);

      anchor.addEventListener('click', () => {
        if (!navigator.clipboard) return;
        const url = `${location.origin}${location.pathname}#${heading.id}`;
        // Announce only on real success (aria-label change on the focused
        // anchor is read out); restore the copy label afterwards.
        navigator.clipboard
          .writeText(url)
          .then(() => {
            anchor.setAttribute('aria-label', copiedLabel);
            anchor.classList.add('is-copied');
            setTimeout(() => {
              anchor.setAttribute('aria-label', label);
              anchor.classList.remove('is-copied');
            }, 1500);
          })
          .catch(() => {});
      });
    });
  });
}

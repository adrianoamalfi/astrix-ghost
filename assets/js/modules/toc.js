/*
 * Builds the table of contents from .gh-content h2/h3 into the #gh-toc
 * shell, with an IntersectionObserver scrollspy. Hidden below 2 headings.
 */
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/(^-|-$)/g, '');
}

export function initToc() {
  const toc = document.getElementById('gh-toc');
  const content = document.getElementById('gh-content');
  if (!toc || !content) return;

  const headings = Array.from(content.querySelectorAll('h2, h3'));
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
    while (seen.has(id) || (document.getElementById(id) && document.getElementById(id) !== heading)) {
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

  toc.hidden = false;

  // Scrollspy
  const links = new Map(
    Array.from(toc.querySelectorAll('a')).map((a) => [decodeURIComponent(a.hash.slice(1)), a])
  );
  let activeLink = null;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const link = links.get(entry.target.id);
          if (link && link !== activeLink) {
            if (activeLink) {
              activeLink.classList.remove('is-active');
              activeLink.removeAttribute('aria-current');
            }
            link.classList.add('is-active');
            link.setAttribute('aria-current', 'location');
            activeLink = link;
          }
        }
      }
    },
    { rootMargin: '0px 0px -70% 0px', threshold: 0 }
  );

  headings.forEach((h) => observer.observe(h));
}

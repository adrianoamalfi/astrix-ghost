/* Automatic infinite loading on paginated feeds: when the pagination nav
   approaches the viewport, fetch the next page and append its cards.
   No-JS, crawlers, Save-Data users and fetch failures keep (or get back)
   the classic prev/next pagination. */
export function initInfiniteScroll() {
  const nav = document.querySelector('.gh-pagination[data-loading]');
  const feed = document.querySelector('.gh-feed');
  if (!nav || !feed) return;

  const link = nav.querySelector('a[rel="next"]');
  if (!link) return;

  // Auto-fetching pages against the user's wish to save data is rude
  if (navigator.connection?.saveData) return;

  const label = nav.querySelector('.gh-pagination-label');
  const loadingText = nav.dataset.loading;
  let nextUrl = link.href;
  let busy = false;

  // Links become a status row; classic pagination returns on fetch failure
  nav.classList.add('gh-pagination--infinite');

  const restoreClassic = () => {
    observer.disconnect();
    nav.classList.remove('gh-pagination--infinite');
  };

  const loadNext = async () => {
    if (busy || !nextUrl) return;
    busy = true;

    const idleText = label?.textContent;
    if (label && loadingText) label.textContent = loadingText;
    feed.setAttribute('aria-busy', 'true');

    try {
      const response = await fetch(nextUrl);
      if (!response.ok) throw new Error(String(response.status));
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');

      // Skip cards already on the page (e.g. featured posts shown in the slider)
      const seen = new Set([...feed.querySelectorAll('.gh-card-link')].map((a) => a.href));
      for (const card of doc.querySelectorAll('.gh-feed > *')) {
        const url = card.querySelector('.gh-card-link')?.href;
        if (url && seen.has(url)) continue;
        feed.append(card);
      }

      if (label) {
        const nextLabel = doc.querySelector('.gh-pagination-label');
        label.textContent = nextLabel ? nextLabel.textContent : idleText;
      }

      const next = doc.querySelector('.gh-pagination a[rel="next"]');
      nextUrl = next ? next.href : null;
      link.href = nextUrl || link.href;

      if (!nextUrl) {
        observer.disconnect();
      } else {
        // Re-observing always reports current state: chains another load
        // when a short page leaves the sentinel still inside the margin
        observer.unobserve(nav);
        observer.observe(nav);
      }
    } catch {
      if (label && idleText) label.textContent = idleText;
      restoreClassic();
    } finally {
      feed.removeAttribute('aria-busy');
      busy = false;
    }
  };

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadNext();
    },
    { rootMargin: '900px 0px' }
  );

  observer.observe(nav);
}

/* Mobile menu + sticky header state. */
export function initNav() {
  const header = document.getElementById('gh-header');
  if (!header) return;

  // Shadow under the header once the page scrolls
  const onScroll = () => {
    header.classList.toggle('is-scrolled', scrollY > 8);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = document.getElementById('gh-burger');
  const nav = document.getElementById('gh-nav');
  if (!burger || !nav) return;

  const labelOpen = burger.getAttribute('aria-label');
  const labelClose = burger.dataset.labelClose;
  const desktopQuery = matchMedia('(min-width: 901px)');

  const syncNavVisibility = (open = header.classList.contains('is-menu-open')) => {
    const hidden = !desktopQuery.matches && !open;
    nav.setAttribute('aria-hidden', String(hidden));
    nav.inert = hidden;
  };

  const setOpen = (open) => {
    header.classList.toggle('is-menu-open', open);
    document.body.classList.toggle('has-menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    syncNavVisibility(open);
    if (labelOpen && labelClose) {
      burger.setAttribute('aria-label', open ? labelClose : labelOpen);
    }
  };

  syncNavVisibility();

  const close = () => {
    setOpen(false);
  };

  burger.addEventListener('click', () => {
    const open = !header.classList.contains('is-menu-open');
    setOpen(open);

    if (open) {
      const firstLink = nav.querySelector('a[href]');
      if (firstLink) firstLink.focus();
    }
  });

  header.addEventListener('click', (event) => {
    if (header.classList.contains('is-menu-open') && event.target === header) {
      close();
    }
  });

  document.addEventListener('click', (event) => {
    if (!header.classList.contains('is-menu-open')) return;
    if (header.contains(event.target)) return;
    close();
  });

  document.addEventListener('keydown', (event) => {
    if (!header.classList.contains('is-menu-open')) return;

    if (event.key === 'Escape') {
      close();
      burger.focus();
      return;
    }

    // Focus trap: while the panel is open, Tab cycles burger + menu links
    if (event.key === 'Tab') {
      const focusables = [
        burger,
        ...nav.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      ];
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!focusables.includes(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) close();
  });

  desktopQuery.addEventListener('change', (mq) => {
    if (mq.matches) close();
    syncNavVisibility();
  });
}

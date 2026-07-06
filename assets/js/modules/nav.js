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

  const close = () => {
    header.classList.remove('is-menu-open');
    burger.setAttribute('aria-expanded', 'false');
    if (labelOpen) burger.setAttribute('aria-label', labelOpen);
  };

  burger.addEventListener('click', () => {
    const open = header.classList.toggle('is-menu-open');
    burger.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && header.classList.contains('is-menu-open')) {
      close();
      burger.focus();
    }
  });

  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) close();
  });

  matchMedia('(min-width: 901px)').addEventListener('change', (mq) => {
    if (mq.matches) close();
  });
}

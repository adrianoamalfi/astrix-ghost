/* Floating "back to top" control. Hidden until the reader has scrolled roughly
   one viewport past the top, then scrolls smoothly back up (respecting
   prefers-reduced-motion). Rendered in default.hbs, so it's available on every
   page but only earns its keep on long ones. */
export function initBackToTop() {
  const button = document.querySelector('.gh-back-to-top');
  if (!button) return;

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  let ticking = false;
  const update = () => {
    ticking = false;
    // One viewport of scroll is a good proxy for "past the hero".
    button.hidden = scrollY < innerHeight;
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

  button.addEventListener('click', () => {
    scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  });
}

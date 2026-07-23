/*
 * Lazy-mount Ghost's native comments. The {{comments}} helper output (which
 * pulls in the comments-ui bundle) is parked inside an inert <template> and
 * only injected when the reader scrolls near the thread, keeping that
 * third-party JS off the initial page load. Degrades to an eager mount where
 * IntersectionObserver is unavailable.
 */
export function initComments() {
  const section = document.querySelector('[data-lazy-comments]');
  if (!section) return;
  const tpl = section.querySelector('template');
  if (!tpl) return;

  const mount = () => {
    const frag = tpl.content.cloneNode(true);
    // Cloned <script> nodes are inert — recreate them so the browser runs them.
    frag.querySelectorAll('script').forEach((old) => {
      const script = document.createElement('script');
      for (const attr of old.attributes) script.setAttribute(attr.name, attr.value);
      if (old.textContent) script.textContent = old.textContent;
      old.replaceWith(script);
    });
    tpl.replaceWith(frag);
  };

  if (!('IntersectionObserver' in window)) {
    mount();
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        obs.disconnect();
        mount();
      }
    },
    { rootMargin: '600px 0px' },
  );

  observer.observe(section);
}

/* Reading progress bar mapped to the article's scroll extent. */
export function initProgress() {
  const bar = document.getElementById('gh-progress-bar');
  const article = document.querySelector('.gh-article');
  if (!bar || !article) return;

  let ticking = false;

  const update = () => {
    ticking = false;
    const rect = article.getBoundingClientRect();
    const total = rect.height - innerHeight;
    const progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 1;
    bar.style.transform = `scaleX(${progress})`;
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

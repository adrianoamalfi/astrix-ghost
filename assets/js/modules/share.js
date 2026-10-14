/* Progressive enhancement for the post share row: the copy-link button copies
   the post URL and confirms via the button's aria-label (announced to screen
   readers) and an .is-copied class for the visual tick. The social links are
   plain anchors that work without JS. Where the Web Share API is available,
   a native share button is revealed and opens the system share sheet. */
export function initShare() {
  const nativeShare = document.querySelector('[data-web-share]');
  if (nativeShare && navigator.share) {
    nativeShare.hidden = false;
    nativeShare.addEventListener('click', () => {
      navigator.share({ title: document.title, url: window.location.href }).catch(() => {
        /* reader dismissed the share sheet */
      });
    });
  }

  document.querySelectorAll('.gh-share-copy').forEach((button) => {
    const url = button.dataset.shareUrl;
    if (!url || !navigator.clipboard) return;

    const label = button.getAttribute('aria-label');
    const copiedLabel = button.dataset.copiedLabel || 'Copied';

    button.addEventListener('click', () => {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          button.setAttribute('aria-label', copiedLabel);
          button.classList.add('is-copied');
          setTimeout(() => {
            button.setAttribute('aria-label', label);
            button.classList.remove('is-copied');
          }, 1500);
        })
        .catch(() => {});
    });
  });
}

/*
 * Adds a copy-to-clipboard button to every code block inside post/page
 * content. Labels come from data-* attributes on the .gh-content host so
 * they stay translatable.
 */
const COPY_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const CHECK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

export function initCodeCopy() {
  if (!navigator.clipboard) return;

  document.querySelectorAll('.gh-content').forEach((content) => {
    const labelCopy = content.dataset.copy || 'Copy';
    const labelCopied = content.dataset.copied || 'Copied';

    content.querySelectorAll('pre').forEach((pre) => {
      const code = pre.querySelector('code') || pre;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'gh-code-copy';
      button.setAttribute('aria-label', labelCopy);
      button.innerHTML = COPY_ICON;
      pre.appendChild(button);

      let reset;
      button.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(code.innerText.replace(/\n+$/, ''));
        } catch {
          return;
        }
        button.classList.add('is-copied');
        button.innerHTML = CHECK_ICON;
        button.setAttribute('aria-label', labelCopied);
        clearTimeout(reset);
        reset = setTimeout(() => {
          button.classList.remove('is-copied');
          button.innerHTML = COPY_ICON;
          button.setAttribute('aria-label', labelCopy);
        }, 2000);
      });
    });
  });
}

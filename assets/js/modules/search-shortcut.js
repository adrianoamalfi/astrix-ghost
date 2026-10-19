/*
 * Global keyboard shortcut for Ghost search: Cmd/Ctrl+K anywhere, or "/"
 * when not typing in a field. Clicks the existing [data-ghost-search]
 * button so the sodo-search overlay opens exactly as a click would.
 * Also sets the platform-appropriate hint on the .gh-search-kbd element.
 */
export function initSearchShortcut() {
  const searchBtn = document.querySelector('[data-ghost-search]');
  if (!searchBtn) return;

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.isComposing) return;

    const mod = event.metaKey || event.ctrlKey;
    const cmdK = mod && (event.key === 'k' || event.key === 'K');
    const slash = event.key === '/' && !mod && !event.altKey;

    if (!cmdK && !slash) return;

    // "/" only when not typing in a field
    if (slash) {
      const t = event.target;
      const typing =
        t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (typing) return;
    }

    event.preventDefault();
    searchBtn.click();
  });

  // Platform-appropriate hint. The old platform property is deprecated, so
  // read the user agent (still universally present) for the Apple check.
  const kbd = document.querySelector('.gh-search-kbd');
  if (kbd) {
    kbd.textContent = /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘K' : 'Ctrl K';
  }
}

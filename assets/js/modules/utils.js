/* Shared helpers for the theme's JS modules. */

// Turns heading text into a URL-safe id/slug. Unicode-aware: keeps letters and
// numbers from any script, collapses everything else to single hyphens.
export function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/(^-|-$)/g, '');
}

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

// A string with malformed percent-encoding (e.g. a lone `%` from pasted
// content) makes decodeURIComponent throw a URIError; fall back to the raw
// value so one bad heading id can't crash a whole module.
export function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

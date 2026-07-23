# Changelog

All notable changes to Astrix. Downloadable theme packages live on the
[releases page](https://github.com/adrianoamalfi/astrix-ghost/releases).

## 0.2.1 — Small fixes

- Point the footer theme credit to `https://adrianoamalfi.com/astrix/`.
- Make the inline-code chip clearly visible in both light and dark (the old
  `--color-background-muted` was ~5% opacity and read as unstyled).

## 0.2.0 — Hardening, i18n, performance & new features

A broad quality pass closing 31 tracked issues (five more were closed as
invalid or already-mitigated after verification).

### Security & robustness
- Block AI crawlers from `/p/` (preview) and `/r/` (share) paths in `robots.txt`.
- Add `rel=noreferrer` to external `target=_blank` links.
- Guard the TOC scrollspy against malformed heading ids (no more `URIError`).
- Explain the infinite-scroll fallback to readers on a failed fetch.
- Harden the cssnano config (disable `colormin`) so modern color syntax survives.
- Document the admin-only URL-setting threat model in `SECURITY.md`.

### Accessibility
- Announce subscribe-form feedback (`role="status"` / `role="alert"`).
- Announce the heading-anchor and share "Copied" confirmations to screen readers.
- Add an `<h1>` to the 404 page; fall back to the post title for empty card alt text.
- Fix focus outlines on circular controls; block a second subscribe click while loading.

### Internationalization
- Route the last hardcoded strings (social labels, author links) through `{{t}}`.
- Support community locales beyond `en`/`it`: the i18n check now validates every
  `locales/*.json` (extra locales are reported, never blocking). See CONTRIBUTING.

### Performance
- Serve **AVIF** with a WebP fallback via `<picture>` on feature/hero/card images.
- Add **print styles**; strip ~4.7 KB of unused `.astryx-*` CSS from every page.
- Keep the homepage feed out of the LCP preload race.

### New features
- **Share row** on posts (X, Facebook, LinkedIn, copy link).
- **Back-to-top** button on long pages.
- **Swipe** navigation in the image lightbox.
- Custom social icons on author pages.
- **Newsletter archive** page template (`custom-newsletter.hbs`).

### Developer experience
- Centralise breakpoints as `@custom-media` (postcss-custom-media).
- Add **ESLint + Prettier** and **Vitest** unit tests, all enforced by `npm run check` / CI.
- De-duplicate the shared `slugify`/`safeDecode` utilities.

## 0.1.0 — Initial public release

First open-source release of Astrix, a bold, image-led Ghost theme built on
the Astryx design tokens.

- **Four homepage hero styles** (Poster / Editorial / Split / Personal) and
  three feed layouts (Bold grid / Mosaic / List), selectable in Ghost Admin.
- **Native dark / light / system** color scheme via `light-dark()`, with a
  zero-flash persisted toggle.
- **Scheme-safe accent system**: the Ghost Admin accent is derived into fill,
  ink and line tokens so it stays readable on both schemes.
- **Reading experience**: sticky table of contents with a reading-line
  scrollspy, reading progress bar, related posts, native comments, and a
  reading-scale prose measure.
- **Membership-ready**: subscribe forms, Portal integration, a single
  tier-aware gated-content CTA, and a pricing-grid membership page.
- **Native Ghost search** and fully styled Koenig cards.
- **Internationalization**: English and Italian locales; every UI string
  goes through `{{t}}`.
- Self-hosted [Figtree](assets/fonts/OFL.txt) with a zero-CLS fallback, and
  Ghost custom-font support.

The visual system is documented in [DESIGN.md](DESIGN.md).

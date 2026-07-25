# Changelog

All notable changes to Astrix. Downloadable theme packages live on the
[releases page](https://github.com/adrianoamalfi/astrix-ghost/releases).

## 0.2.5 — Author page

- The author masthead now uses the author's `cover_image`: a full-bleed poster
  band with the same backdrop/scrim mechanics as the tag archive, forced dark,
  with the cover preloaded from `<head>` as the LCP. Without a cover — Ghost's
  default — the band sits on the page surface with a faint accent wash instead
  of dissolving into the canvas. Every text layer over a cover was measured
  against the brightest image on the site rather than eyeballed: kicker, title,
  bio and meta all clear WCAG AA at the worst pixel, on mobile and desktop.
- Fix the author avatar, which never received its base styles. They lived in
  `prose.css`, which only `post.css` imports and which `default.hbs` loads on
  `post, page` alone — so on the author page the avatar rendered as an
  unclipped square with `object-fit: fill`, stretching any non-square photo.
  They now live in `components/avatar.css`, loaded by `screen.css` everywhere.
  The avatar is also fluid (88→128px), served with a `srcset`, and eagerly
  fetched, since it is the LCP on a coverless author page.
- Fix the no-photo fallback avatar in both the author masthead and post
  bylines. `::first-letter` never applies to a flex box, so `font-size: 0` hid
  the name and nothing replaced it: the circle painted empty. In cards the
  circle collapsed entirely, because the name-truncation rule also caught the
  avatar and `28ch` at `font-size: 0` resolves to `max-width: 0`.
- The author header shows the author's own accounts only. It used to repeat
  the publication's full social row — the same icons the footer already
  carries on every page — under a person's name, which read as theirs.
- Add the post count (and location, when set) to the author masthead, and stop
  reserving space for a links row that has no links.
- The kicker over a photo band (author and tag alike) goes to primary ink. In
  `--gh-accent-text` on a real cover it measured 2.25:1 at 12px: the admin
  accent has no contrast contract with an arbitrary image, which is exactly
  what the Derived Accent Rule is about.

## 0.2.4 — Correct LCP preload, clean audit

- Fix the homepage preload for the Personal header style. When a hero portrait
  is set it renders above the feed and *is* the LCP, but 0.2.3 preloaded the
  first featured card instead — the wrong image, which cost an extra download
  rather than saving one. The portrait now gets the preload, and the featured
  card only when no portrait is set. Verified against a running Ghost: the LCP
  image and the font are each fetched exactly once.
- Patch three high-severity advisories in the build toolchain (`immutable`,
  `brace-expansion`) via npm `overrides`. `npm audit fix --force` would have
  downgraded browser-sync to 1.9.2, so the overrides are pinned instead and
  browser-sync was smoke-tested on the newer immutable. Dev-only: no runtime
  dependency ships with the theme. `npm audit` is now clean.
- `npm run smoke` asserts that every LCP preload matches the image the page
  actually renders. A mismatch is invisible to gscan and to the unit tests but
  silently doubles a download, so it needs a live render to catch.

## 0.2.3 — Hotfix: 0.2.2 broke every page

0.2.2 shipped a helper call written inside a CSS comment in the `<style>`
block of `default.hbs`. Handlebars parses templates in full and knows nothing
about CSS comments, so `{{asset}}` was evaluated with no argument and Ghost
threw `assetPath.match is not a function` while rendering any page. Upgrade
straight past 0.2.2.

- Reword the comment so no helper call is left in a CSS context.
- Emit the inline @font-face URL with a triple-stache: inside `<style>` HTML
  entities are not decoded, so an escaped `=` would corrupt the `?v=` query.
- Add template tests covering both failure modes. gscan compiles templates but
  never invokes helpers, so nothing in the quality gate caught this.

## 0.2.2 — Critical-path fixes (withdrawn)

Withdrawn: this release could not render any page (see 0.2.3). It was pulled
from the releases page and its tag deleted. Everything below shipped in 0.2.3
instead — kept here so the history stays readable.

- Preload the homepage LCP feature image. It was already preloaded on posts
  and pages, but never on the home page, where the hero image was discovered
  mid-body. The `srcset`/`sizes` mirror the variant each `header_style`
  actually renders, so the browser preloads the exact candidate it paints.
- Stop downloading the Figtree Latin subset twice. The preload used the
  version-hashed `{{asset}}` URL while the `@font-face` used a bare relative
  `url()`; the two never matched, so the preloaded font was discarded and
  fetched again. The primary Latin face now lives inline in `default.hbs` and
  shares one URL with the preload.
- Preconnect to `cdn.jsdelivr.net`, which serves Ghost Portal and sodo-search.

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

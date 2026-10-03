# Changelog

All notable changes to Astrix. Downloadable theme packages live on the
[releases page](https://github.com/adrianoamalfi/astrix-ghost/releases).

## 0.3.2 — New-tab notices for screen readers, release notes from the changelog

### Accessibility

- **Footer links that open a new tab now say so.** The recommendations and the
  two credit links (*Theme Astrix*, *Published with Ghost*) all use
  `target="_blank"`, but assistive tech announced only the destination, so the
  new tab came as a surprise. Each of them now carries a visually hidden
  `Opens in a new tab` notice inside the link, through the existing
  `u-visually-hidden` utility — nothing changes on screen. In the credit links
  the notice is separated from the visible text by a real space, so the
  accessible name is no longer read as `AstrixOpens in a new tab`. The new
  string is translated in all seven locales, not just the maintained `en` /
  `it` pair.

### Release & CI

- **The GitHub release body comes from this file.** A new
  `scripts/extract-release-notes.mjs` pulls the `## X.Y.Z — …` section that
  matches the tag being published and fails with a clear message when the
  entry is missing or empty; the `package` job hands it to the release action
  through `body_path`, ahead of GitHub's generated notes. A tag can no longer
  be published without the changelog entry it points at. Locally:
  `node scripts/extract-release-notes.mjs vX.Y.Z <output-file>`.
- **`.git` can no longer ride along in the theme zip.** Inside a git worktree
  `.git` is a plain file rather than a directory, so the existing `".git/*"`
  exclusion missed it. Both the `zip` recipe and the `release-summary`
  forbidden-file check now reject either form.
- `gscan` 6.6.1 (patch) and the `@tryghost/*` packages it unpins, refreshed in
  the lockfile — no downgrade of `gscan`, `postcss-cli` or `browser-sync`, and
  the audit picture is unchanged at 9 `high` findings, all dev-only.
- `softprops/action-gh-release` moves from v2 to v3, which runs on Node 24
  instead of the deprecated Node 20 runtime. The `package` job runs only on
  `v*` tags, so PR CI does not cover it: the new runtime is exercised at the
  first tagged release.

### Documentation

- `README.md` and the showcase page now list the three features 0.3.1 added —
  footer recommendations, Tips & donations entrypoints, SEO breadcrumbs —
  which until now were described only in this changelog.
- `CONTRIBUTING.md` names the 9 remaining `high` audit findings one by one:
  the package, the dependency chain that keeps it stuck, and why the only
  "fix" npm offers would be a downgrade. All of them are dev-only —
  `npm audit --omit=dev` is clean — and the notes say when the
  `brace-expansion` and `engine.io` overrides can be dropped.

## 0.3.1 — Recommendations, donations and SEO breadcrumbs

### New features

- **Ghost recommendations in the footer.** A publication that configures
  recommendations under **Settings → Growth → Recommendations** now shows up
  to four of them above the footer meta row — favicon, title, readable URL
  and description, each opening in a new tab. The section renders only when
  there are recommendations, so a site without any keeps the footer it had.
- **Tips & donations entrypoints.** With donations enabled in Ghost Admin, a
  *Support this site* button opens Portal's support flow from the site footer
  and from the post share row. Both are gated on `@site.donations_enabled`, so
  nothing renders — and no space is reserved — when donations are off.
- **SEO breadcrumbs.** Posts join pages, tags, authors and the archive /
  newsletter templates in rendering the breadcrumb trail, and the visible
  `nav` now carries `BreadcrumbList` microdata on all of them: each crumb is
  an `itemListElement` with its `item`, `name` and `position`. The last crumb
  is the current page — `aria-current="page"`, described through a `WebPage`
  `itemid` instead of a link to itself, and labelled with its real title or
  name rather than the generic *Page* / *Tag* / *Author* placeholder (the
  now-unused `Page` string is dropped from every locale). The post-only
  JSON-LD mirror is gone: the markup readers see *is* the structured data, so
  there is no second copy to keep in sync and no title to escape into a JSON
  string — backslashes in post, tag and author names produced invalid
  JSON-LD, and quotes and apostrophes were emitted as HTML entities. Google
  accepts microdata, though JSON-LD remains its recommended format; validate
  with the Rich Results Test once deployed.

### Developer experience

- Declare Node.js 22.17.0 or newer as the supported development engine for the
  theme tooling, matching the current Ghost 6 checks used by `gscan` and
  rendered-page validation. Node builds the theme; what ships is compiled CSS,
  bundled JS and Handlebars templates.
- Document the Node 22 requirement in the development setup notes.
- Pin patched transitive dev dependencies with npm `overrides`
  (`brace-expansion` 1.x and 5.x, `engine.io`, `immutable`), taking the high
  severity advisories from 11 to 9 without downgrading `gscan`, `postcss-cli`
  or `browser-sync`. Every remaining finding is dev-only — `npm audit
  --omit=dev` is clean — and is blocked by an upstream package with no fixed
  release. `CONTRIBUTING.md` gains a *Dependency audit notes* section with the
  override policy and why `npm audit fix --force` must not be applied blindly
  here.
- Refresh the npm lockfile after the 0.3.0 release so package metadata and
  engine constraints stay aligned for reproducible installs.
- The two new UI strings (`Recommended sites`, `Support this site`) are
  translated in all seven locales, not just the maintained `en` / `it` pair.

## 0.3.0 — Rendered-DOM checks in CI, five new languages, settings that explain themselves

### Upgrade note

**Show author meta** changed from an on/off toggle to a three-way choice —
*Name and avatar* / *Name only* / *Hidden*. Ghost resets a custom setting to
its default when its type changes, so if you had author meta turned **off**,
re-select *Hidden* under **Design → homepage** after upgrading.

### Accessibility

- A feature image with no alt text no longer falls back to the post title. A
  screen reader was announcing the title twice — once from the heading, once
  from the image beside it. Author avatars next to a linked name are now
  `alt=""` for the same reason. `npm run check:a11y` now fails if an `alt` is
  set to `{{title}}` or `{{name}}`.
- The redundant image link in the Editorial and Split heroes — same
  destination as the title right above it — is hidden from assistive tech and
  removed from the tab order.

### Performance

- The post and page feature image now reserves a fixed 3:2 box. It had no CSS
  aspect ratio, so the browser sized it 16:9 from the fixed `width`/`height`
  and then reflowed on load — a layout shift on the LCP element for every
  non-16:9 image. Non-3:2 images are now cropped, like the hero and card media
  already are.
- Post-only JavaScript (table of contents, reading progress, lightbox, code
  copy, heading anchors, share) moved to a separate `post.js`, loaded only on
  posts and pages. The home, tag and author pages ship ~2.5 KB less gzipped
  JS, mirroring the existing `post.css` split.
- Showcase screenshots are WebP instead of PNG (~8× smaller).

### Internationalisation

- New locales: **German, Spanish, French, Portuguese (Brazil), Dutch**.
  English and Italian stay the maintained pair; the five new ones are
  community translations and never block the build.

### Theme settings

- Every setting now carries a description in Ghost Admin.
- **Show author meta** gains a *Name only* mode — keep the linked byline, drop
  the avatar — alongside the new *Hidden* mode.
- The README documents which Admin control paints which part of the page:
  **Brand color** drives the navy identity voice, **Secondary accent** the
  gold interaction-and-value voice, and the derived accent tokens
  (`--gh-accent-fill` / `-text` / `-line`) are computed, not separate knobs.
- Two accent uses that could disappear under a dark Admin colour on the dark
  scheme — the ghost-button hover border and the reading-progress bar — now go
  through the scheme-safe derived tokens.

### Quality & CI

- A new CI job renders the theme in a real Ghost and runs **axe-core** on
  home / post / page / tag / author / 404 in **light and dark**, plus the
  route smoke test (finally in CI) and a CLS budget. Every other check is
  static analysis of the `.hbs` sources; nothing saw what Ghost actually
  painted — the class of regression that shipped in 0.2.2 and 0.2.4.
- `partials/head-preload.hbs` gains a parity test: every LCP preload must
  mirror a rendered image candidate exactly, or the build fails. The tag
  archive now preloads its cover image, like the author archive.
- `custom-archive.hbs` bounds its `{{#get}}` queries at 100 instead of
  `"all"` — the last gscan warning is gone. A publication past 100 posts sees
  a note pointing to the topic list for older entries.
- Removed six inert `data-astryx-*` attributes that no rule ever selected; a
  test keeps them from returning.

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

# Astrix

A bold, expressive personal blog theme for **Ghost ≥ 6.0**, built on the
[Astryx design system](https://www.npmjs.com/package/@astryxdesign/core) design tokens.

Astryx components are React-only, so the theme consumes Astryx as a
**tokens-only foundation**: the 184 design tokens (colors, spacing, radius,
elevation, motion, semantic typography) are extracted from
`@astryxdesign/core` at build time and every theme component is hand-written
CSS on top of that vocabulary. All color tokens use `light-dark()`, which is
what makes the dark mode implementation a one-liner.

## Features

- **Bold, image-first design** — poster-sized fluid typography, full-bleed hero, three homepage hero styles (Poster / Editorial / Split) and three feed layouts (Bold grid / Mosaic / List), all selectable in Ghost Admin → Design.
- **Dark / light / system color scheme** — persisted toggle, zero-flash on load, driven natively by `color-scheme` + `light-dark()`.
- **Membership-ready** — subscribe forms, Portal integration, tier-aware gated-content CTAs, `custom-membership` page template with a pricing grid.
- **Reading experience** — sticky table of contents with scrollspy, reading progress bar, related posts, native Ghost comments, ~68ch measure with fluid prose scale.
- **Native Ghost search** (sodo-search) and styled Koenig cards (callouts, bookmarks, galleries, toggles, signup, product, audio/video/file…).
- **i18n** — Italian and English locales; every UI string goes through `{{t}}`.
- Ghost **custom fonts** supported (`--gh-font-heading` / `--gh-font-body`).

## Browser support

The theme relies on modern CSS (`light-dark()`, `@scope`, `color-mix()`,
cascade layers): Chrome/Edge 123+, Safari 17.5+, Firefox 137+.

## Development

```bash
npm install
npm run build     # extract Astryx tokens + bundle CSS/JS into assets/built/
npm run dev       # watch + browser-sync proxy against http://localhost:2368
npm test          # gscan validation
npm run check:i18n # verifies template translation keys exist in locales
npm run check:a11y # verifies common template accessibility invariants
npm run check     # build + gscan validation, recommended before commits/releases
npm run smoke     # local Ghost route smoke test, requires http://localhost:2368
npm run zip       # check + dist/astrix.zip, ready to upload to Ghost Admin
npm run release   # zip + package summary
```

For local development, symlink this folder into a local Ghost install and
restart Ghost:

```bash
ghost install local            # in a separate folder, e.g. ~/ghost-dev
ln -s /path/to/astrix-ghost ~/ghost-dev/content/themes/astrix
ghost restart
```

Locale changes and `package.json` changes require a Ghost restart; template
changes only need a browser refresh in development mode.

Run `npm run check` before publishing changes. `npm run zip` runs the same
validation before creating the upload package. The generated zip contains
runtime assets only; source CSS/JS stays in the repository.

Use `VISUAL_QA.md` as the manual browser checklist before uploading a theme
release.

`npm run smoke` checks the local Ghost routes listed in `VISUAL_QA.md`. Set
`GHOST_URL` to test a different local URL.

## Theme settings (Ghost Admin → Design)

| Setting | Options | Default |
|---|---|---|
| Navigation layout | Logo on the left / Logo in the middle | left |
| Color scheme default | System / Light / Dark | System |
| Secondary accent | color | `#f5b301` |
| Header style | Editorial / Poster / Split | Poster |
| Feed layout | Bold grid / Mosaic / List | Bold grid |
| Featured slider | on / off | on |
| CTA headline / text | free text | built-in copy |
| Table of contents | on / off | on |
| Reading progress | on / off | on |
| Related posts | on / off | on |

## License

MIT

# Contributing to Astrix

Thanks for your interest! Bug reports, translations and focused pull
requests are all welcome.

## Getting started

Development setup, build commands and the full script reference live in the
[README](README.md#development). Short version:

```bash
npm install
npm run dev     # watch CSS/JS + browser-sync proxy against a local Ghost at :2368
npm run check   # build + gscan + i18n + a11y — must pass before every PR
```

You'll want a local Ghost ≥ 6.0 install with the theme symlinked into
`content/themes/astrix` (see the [Ghost docs](https://ghost.org/docs/install/local/)).
Ghost caches templates: restart it after editing `.hbs` files.

### Dependency audit notes

`npm audit` is useful before dependency updates, but this theme's install is
dev-tooling only: Astrix ships compiled assets and Handlebars templates, not
its npm dependency tree. Prefer compatible direct upgrades and targeted
`overrides` for patched transitive packages. Do not apply
`npm audit fix --force` blindly if it downgrades Ghost 6 tooling such as
`gscan`, `postcss-cli` or `browser-sync`; document any remaining findings that
are blocked by upstream packages with no fixed release.

After the 0.3.1 override pass, `npm audit --json` reports **9 `high`
findings**, all dev-only (`npm audit --omit=dev` is clean):

| Package | Chain | Why it is stuck |
|---|---|---|
| `braces` | `chokidar` / `micromatch` → `braces` ≤3.0.3 | No fixed release — 3.0.3 is the latest (GHSA-vfj7-8cjw-p6xm). |
| `micromatch` | `browser-sync` / `jscodeshift` → `micromatch` → `braces` | Flagged only through `braces`; every version is affected. |
| `chokidar` | `browser-sync` / `postcss-cli` → `chokidar` 3.x → `braces` | Parents require chokidar `^3`; the glob-free 4.x+ line needs major bumps downstream. |
| `browser-sync` | → `chokidar` + `micromatch` | npm's only "fix" is a downgrade to browser-sync 2.25.0. |
| `postcss-cli` | → `chokidar` 3.x | The fixed line is postcss-cli 12.0.0 — a major bump. |
| `jscodeshift` | `@astryxdesign/cli` → `jscodeshift` → `micromatch` | jscodeshift 17.4.0 (already in range) drops micromatch; a lockfile refresh clears this finding. |
| `extract-zip` | `gscan` → `@tryghost/zip` → `extract-zip` | No fixed release — 2.0.1 is the latest and both symlink advisories affect it. |
| `@tryghost/zip` | `gscan` → `@tryghost/zip` → `extract-zip` | Pinned by `gscan`; inherits the unfixed `extract-zip`. |
| `gscan` | → `@tryghost/zip` → `extract-zip` | npm's only "fix" is a downgrade to gscan 3.3.1; theme validation targets Ghost 6 tooling (gscan 6.x). |

The `brace-expansion@5` and `engine.io` entries in `overrides` are stop-gaps:
remove each one as soon as `eslint` (via `minimatch`) and `browser-sync` (via
`socket.io`) already require the patched versions themselves, so the tree
resolves correctly without forcing them.

## Ground rules

- **Tokens only.** No raw hex/px in theme CSS. Never override `--color-*` on
  `:root`; theme knobs are new `--gh-*` variables. The visual system —
  including the accent rules (`--gh-accent-fill` / `-text` / `-line`) and
  both color schemes — is documented in [DESIGN.md](DESIGN.md); changes must
  hold in **light and dark**.
- **Source lives in `assets/css` and `assets/js`**; `assets/built/` is
  generated (commit the rebuilt bundles with your change).
- **i18n**: every user-facing string goes through `{{t}}` with keys in both
  `locales/en.json` and `locales/it.json`. New locales are very welcome — see
  [Translations](#translations) below.
- **Accessibility**: keep focus states, aria labels and 44px touch targets
  intact; `npm run check:a11y` guards the basics.

## Pull requests

1. Fork, branch from `main`.
2. Make the change; run `npm run check`.
3. For visual changes, include before/after screenshots (light + dark).
4. Keep PRs focused — one concern per PR.

CI runs the same `npm run check` on every PR.

## Translations

Locales live in `locales/<lang>.json`, keyed by
[IETF language tag](https://en.wikipedia.org/wiki/IETF_language_tag) (`fr`,
`de`, `es`, `pt-BR`, …). Ghost loads the file matching the site's
**Publication language** (Settings → General), falling back to `en`.

Shipped today: `en` and `it` (maintained), plus `de`, `es`, `fr`, `pt` and
`nl` as community translations. Corrections and new languages are welcome.

To add a language:

1. Copy `locales/en.json` to `locales/<lang>.json` — keep every key, translate
   only the values. Keep `{placeholders}` like `{page}` / `{siteTitle}` and
   the `%` plural marker (`% posts`) intact.
2. Run `npm run check:i18n`. It lists any keys your locale is still missing.
   `en` and `it` are maintained locales and must be complete; any other locale
   is treated as a community translation — the check reports how far behind it
   is but never fails CI, so an untranslated key just falls back to English.
3. Restart Ghost to pick up the new locale, then set the Publication language
   to test it.
4. Open a PR. Partial translations are fine — a mostly-translated locale beats
   none, and later PRs can fill the gaps.

## Reporting bugs

Open an [issue](https://github.com/adrianoamalfi/astrix-ghost/issues) with
your Ghost version, browser, theme version, and screenshots when visual.

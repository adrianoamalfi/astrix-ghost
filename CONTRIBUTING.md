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

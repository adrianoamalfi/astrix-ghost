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
  `locales/en.json` and `locales/it.json`. New locales are very welcome —
  copy `en.json` and translate.
- **Accessibility**: keep focus states, aria labels and 44px touch targets
  intact; `npm run check:a11y` guards the basics.

## Pull requests

1. Fork, branch from `main`.
2. Make the change; run `npm run check`.
3. For visual changes, include before/after screenshots (light + dark).
4. Keep PRs focused — one concern per PR.

CI runs the same `npm run check` on every PR.

## Reporting bugs

Open an [issue](https://github.com/adrianoamalfi/astrix-ghost/issues) with
your Ghost version, browser, theme version, and screenshots when visual.

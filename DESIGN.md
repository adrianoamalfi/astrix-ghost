---
name: Astrix
description: Bold, image-led Ghost theme on Astryx tokens — poster typography, flat surfaces, two color voices.
colors:
  regia-navy: "#11245c"
  response-gold: "#f5b301"
  gold-text-safe: "#7d6000"
  ink: "#171717"
  ink-secondary: "#565656"
  canvas: "#f1f1f1"
  surface: "#ffffff"
  hairline: "#ebebeb"
typography:
  display:
    fontFamily: "Figtree, 'Figtree Fallback', -apple-system, sans-serif"
    fontSize: "clamp(2.75rem, 1.1rem + 5.6vw, 5.75rem)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Figtree, 'Figtree Fallback', -apple-system, sans-serif"
    fontSize: "clamp(1.5rem, 1.15rem + 1.5vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Figtree, 'Figtree Fallback', -apple-system, sans-serif"
    fontSize: "clamp(1.0625rem, 1rem + 0.35vw, 1.1875rem)"
    fontWeight: 400
    lineHeight: 1.7
  prose:
    fontFamily: "Figtree, 'Figtree Fallback', -apple-system, sans-serif"
    fontSize: "clamp(1.125rem, 1.083rem + 0.21vw, 1.25rem)"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Figtree, 'Figtree Fallback', -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    letterSpacing: "0.12em"
rounded:
  inner: "4px"
  element: "8px"
  container: "12px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  "12": "48px"
components:
  button-primary:
    backgroundColor: "{colors.regia-navy}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "8px 20px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.container}"
---

# Design System: Astrix

## 1. Overview

**Creative North Star: "The Two-Voice Poster"**

Astrix is a poster, not a pamphlet. Titles are set at display size with tight leading (1.02) and confident tracking; imagery runs edge to edge; surfaces stay flat. The system speaks in exactly two color voices: **navy speaks** (identity, wayfinding, the brand asserting itself) and **gold answers** (everything that responds to the reader — hover, focus, selection, and value moments like premium and subscribe). Nothing else on the page gets a color opinion.

The theme is built *on top of* the Astryx design system, never against it: every value is a token, and every theme-level knob is a new `--gh-*` variable mapped onto Astryx primitives. The accent is not owned by the theme — it tracks Ghost Admin → Design, so every accent usage must survive an arbitrary admin color on both schemes (see the Derived Accent Rule).

It explicitly rejects: generic SaaS landing-page polish, decorative card grids, oversized rounded panels, repeated tiny eyebrow labels, and mobile menus that feel like cramped desktop navigation.

**Key Characteristics:**
- Mobile reading first; article body sized like a reading app (18–20px, 65ch).
- Flat depth: surface contrast and hairlines, never drop shadows.
- Two color voices with strictly separated jobs.
- One family (Figtree) at committed weight/size contrast; no font pairing.
- Both schemes are first-class: every color is `light-dark()`-aware or derived scheme-safe.

## 2. Colors

A neutral stage for photography, with two saturated voices that never trade jobs.

### Primary
- **Regia Navy** (#11245c, `--gh-accent`): identity and wayfinding — buttons, active states, brand marks. This is the *current* Ghost Admin accent, not a constant: treat `--gh-accent` as an input.
- **Accent Fill** (`--gh-accent-fill`, raw accent on light / lifted 35% toward the ink ramp on dark): every solid accent surface — buttons, badges, chips, callouts — paired with white (`--gh-on-accent`). Keeps CTAs visible when a dark admin accent meets the dark canvas.
- **Accent Line** (`--gh-accent-line`, accent mixed 60% toward text-secondary): the only accent allowed on thin lines — link underlines, section rules, blockquote borders, TOC indicators. Survives a dark admin accent on the dark scheme.
- **Accent Text** (`--gh-accent-text`, raw accent on light / lifted toward the ink ramp on dark): the only accent allowed as ink — link hovers, list markers, kickers, the 404 code.

### Secondary
- **Response Gold** (#f5b301, `--gh-accent-2`): the second voice. Two roles only: interaction feedback (hover, focus ring, text selection) and value moments (premium badges, subscribe). As text it always goes through **Gold Text-Safe** (#7d6000 on light, raw gold on dark, `--gh-accent-2-text`).

### Neutral
- **Ink** (#171717 light / #fafafa dark): primary text.
- **Ink Secondary** (`--gh-text-secondary`, raw #737373 mixed 72% toward Ink): all secondary *text* — the raw Astryx secondary fails AA at body sizes; raw stays reserved for decorative mixes.
- **Canvas** (#f1f1f1 / #1b1b1b): page background.
- **Surface** (#ffffff / #262626): cards, footer, raised panels — depth by contrast, not shadow.
- **Hairline** (#ebebeb / 10% white): borders and dividers.

### Named Rules
**The Two Voices Rule.** Navy asserts, gold responds. Interaction feedback (hover, focus, selection) answers in gold; identity and wayfinding stay navy. A hover that turns navy or a logo that turns gold is a category error.

**The Derived Accent Rule.** Raw `--gh-accent` never touches a scheme-dependent surface directly — the admin can choose a color that vanishes in dark mode. Solid fills go through `--gh-accent-fill` (paired with `--gh-on-accent`); text, icons and markers through `--gh-accent-text`; underlines, rules and thin borders through `--gh-accent-line`.

**The Token Wall Rule.** Never override `--color-*` on `:root`; never write raw hex or px in theme CSS. New knobs are `--gh-*` variables mapped onto Astryx tokens.

## 3. Typography

**Display & Body Font:** Figtree (self-hosted), with metrics-matched "Figtree Fallback" to kill font-swap CLS, then the system stack. A Ghost Admin custom font wins via `--gh-font-heading`/`--gh-font-body`.

**Character:** one geometric-humanist family doing everything through weight and scale contrast — poster-bold at display size, quiet at UI size. No second family, ever.

### Hierarchy
- **Display** (700, `clamp(2.75rem → 5.75rem)`, 1.02, -0.025em): post titles and hero headlines. A separate mobile clamp (2.25→3.5rem) keeps titles inside the viewport.
- **Headline** (700, `clamp(1.5rem → 2.25rem)`): section titles, paired with a gradient rule that fades to transparent.
- **UI Body** (400, 17–19px fluid, 1.7): all chrome — nav, cards, footer. Inherited from `body`.
- **Prose** (400, 18–20px fluid, 1.6, 65ch measure): article body, sized like a reading app (Medium-class). Tighter leading than UI because at 20px extra leading reads as gaps.
- **Label** (700, 12px, 0.12em tracking, uppercase): kickers and tags, in `--gh-accent-text`.

### Named Rules
**The Two Baselines Rule.** Chrome text lives on the UI scale (17–19px); article text lives on the prose scale (18–20px, 65ch). Astryx's app-sized tokens (base 14px) are for dense component internals only — never for reading surfaces.

## 4. Elevation

Flat. No drop shadows anywhere. Depth is conveyed by surface contrast (Canvas → Surface), hairline borders, and a 1px inner ring drawn over media edges (`--gh-media-ring`, outline with -1px offset, which follows border-radius unlike inset box-shadow). Astryx ships shadow tokens; this theme deliberately does not use them.

### Named Rules
**The Flat Press Rule.** Interactive elements respond by compressing (`transform: scale(0.97)` on active) or by tinting — never by floating. If a change looks like something lifted off the page, it's wrong.

## 5. Components

### Buttons
- **Shape:** full pill (`--radius-full`), min-height 36px (52px for `--large`).
- **Primary:** Regia Navy fill, white text, semibold, 8px/20px padding. Hover darkens toward ink (`--gh-accent-hover`); active compresses to 0.97.
- **Ghost:** transparent with emphasized hairline border, ink text; hover tints with `--gh-accent-muted` and borders in accent.
- **Icon button:** 36px circle, transparent at rest, `--color-overlay-hover` tint on hover; gold focus ring.

### Cards / Containers
- **Corner Style:** 12px (`--radius-container`); media shares the same radius plus the 1px media ring.
- **Background:** Surface on Canvas; no borders on cards, no shadows (see Elevation).
- **Internal Padding:** spacing-4 to spacing-6.

### Navigation
- **Header nav:** pill-shaped links (padding 6px/12px), Ink Secondary at rest; hover brightens to Ink over `--color-overlay-hover`; current page sits on `--gh-accent-muted`. List-style navs (header, TOC, breadcrumbs, footer) all brighten to Ink on hover — accent hovers are reserved for the logo/brand only.
- **TOC:** active item gets an `--gh-accent-line` left indicator and `--gh-accent-text` label.

### Links
- **Inline text links** (prose, footer credits): underlined with `--gh-accent-line` decoration (2px in prose, 1px in small print), 0.2em offset; hover answers in `--gh-accent-2-text` (prose hovers use `--gh-accent-text`).
- **Focus:** global 2px `--gh-accent-2-text` outline, 2px offset — gold is the touch voice.

### Section Title (signature)
Headline-weight text followed by a flex-grown 3px rule: `linear-gradient(90deg, var(--gh-accent-line), transparent)`, rounded full. The rule is the theme's wayfinding signature; don't replace it with eyebrows or numbered kickers.

## 6. Do's and Don'ts

### Do:
- **Do** route every accent-as-ink usage through `--gh-accent-text` and every accent line through `--gh-accent-line`; the admin accent is an input, not a constant.
- **Do** answer every reader interaction in gold (`--gh-accent-2-text` for text, raw gold for selection/rings).
- **Do** keep article prose at 18–20px, 1.6 leading, 65ch; keep titles inside their mobile clamp.
- **Do** keep touch targets at ≥44px pitch on mobile (nav rows, icon buttons).
- **Do** verify both schemes for every change — `light-dark()` is the default posture, not an afterthought.

### Don't:
- **Don't** add drop shadows, glassmorphism, or gradient text — flat surfaces and solid ink, always.
- **Don't** reproduce "generic SaaS landing-page polish, decorative card grids, oversized rounded panels" (PRODUCT.md anti-references, verbatim).
- **Don't** scatter "repeated tiny eyebrow labels" above sections; the section-title rule is the one sanctioned kicker system.
- **Don't** wrap dense lists in cards, or nest cards; rows and hairlines carry density.
- **Don't** introduce a second font family or override `--color-*` on `:root`.
- **Don't** build "mobile menus that feel like cramped desktop navigation" — the mobile menu is its own full-surface pattern.

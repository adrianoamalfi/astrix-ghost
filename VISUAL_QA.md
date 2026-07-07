# Visual QA

Run before uploading a release package.

## Required Pages

- Home: `http://localhost:2368/`
- Post: `http://localhost:2368/kitchen-sink-tutte-le-card-koenig/`
- Gated post: `http://localhost:2368/post-riservato-agli-iscritti/`
- Page: `http://localhost:2368/about/`
- Tag: `http://localhost:2368/tag/design/`
- Author: `http://localhost:2368/author/adriano/`
- 404: `http://localhost:2368/404-not-found-test/`
- Membership: `/membership/` if the custom page is assigned in Ghost Admin.

## Viewports

- Mobile: 390 x 844
- Tablet: 768 x 1024
- Desktop: 1440 x 1000

## Interactions

- Mobile menu opens, traps focus, closes with Escape and link click.
- Search opens and closes without layout breakage.
- Color scheme cycles system -> light -> dark -> system.
- Newsletter form has stable success and error states.
- Gated post CTA shows one primary action and a clear sign-in link.
- Locked post cards keep the normal card layout, blur the image, and show a visible access label.

## Release Check

```bash
npm run check:i18n
npm run check:a11y
npm run smoke
npm run release
```

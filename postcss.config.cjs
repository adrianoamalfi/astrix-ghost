module.exports = {
  plugins: [
    require('postcss-import')(),
    // Resolve @custom-media (theme/breakpoints.css) after imports are inlined,
    // before cssnano runs. Keeps every breakpoint value in one place.
    require('postcss-custom-media')(),
    require('cssnano')({
      preset: ['default', {
        // Modern CSS the theme relies on must pass through untouched.
        // Verified against the built output: light-dark(), color-mix(in
        // oklab, …) and @layer all survive minification. calc/minifyFontValues
        // are disabled defensively; colormin is disabled because it can rewrite
        // hex arguments nested inside light-dark()/color-mix(). @layer ordering
        // is cascade-safe in cssnano, so mergeRules stays on to keep the build small.
        calc: false,
        minifyFontValues: false,
        colormin: false
      }]
    })
  ]
};

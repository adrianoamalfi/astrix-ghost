module.exports = {
  plugins: [
    require('postcss-import')(),
    require('cssnano')({
      preset: ['default', {
        // light-dark(), @scope and @layer must pass through untouched
        calc: false,
        minifyFontValues: false
      }]
    })
  ]
};

import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    // docs/demos holds the generated static demo export (minified bundles and
    // rendered HTML) — it is build output, not source, so it is not linted.
    ignores: [
      'node_modules/**',
      'dist/**',
      'assets/built/**',
      'assets/css/vendor/**',
      'docs/demos/**',
    ],
  },
  js.configs.recommended,
  {
    // Browser runtime modules
    files: ['assets/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
    },
  },
  {
    // Node build/check scripts and ESM configs
    files: ['scripts/**/*.mjs', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
  },
  {
    // CommonJS config
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: globals.node,
    },
  },
  {
    // Unit tests (explicit imports from vitest). Most run under Node; the DOM
    // suite declares the jsdom environment in its own file, so browser globals
    // are available where the test mounts markup.
    files: ['test/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
  },
];

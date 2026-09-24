import js from '@eslint/js';

const browser = {
  Astro: 'readonly', document: 'readonly', window: 'readonly', Intl: 'readonly',
  requestAnimationFrame: 'readonly', cancelAnimationFrame: 'readonly',
  IntersectionObserver: 'readonly', ResizeObserver: 'readonly',
  setTimeout: 'readonly', clearTimeout: 'readonly'
};

export default [
  js.configs.recommended,
  {
    files: ['astro.js', 'scripts.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: browser }
  },
  {
    files: ['validacion.mjs'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { console: 'readonly', process: 'readonly' } }
  },
  {
    files: ['smoke-test.cjs'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: { console: 'readonly', process: 'readonly', require: 'readonly', __dirname: 'readonly', Intl: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly' } }
  },
  {
    rules: {
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-shadow': 'error',
      'prefer-const': 'error',
      'no-var': 'error'
    }
  }
];

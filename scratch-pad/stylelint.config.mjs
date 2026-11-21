import tokens from './.token-lint/stylelint-tokens.mjs'

export default {
  plugins: [tokens],
  rules: {
    'tokens/value-from-token': true,
    'color-no-invalid-hex': true,
    'declaration-block-no-duplicate-properties': true,
    'no-descending-specificity': null,
  },
  overrides: [
    {
      files: ['src/browser-page/design-system/tokens/*.css'],
      rules: { 'tokens/value-from-token': null },
    },
  ],
}

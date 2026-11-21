import { RuleTester } from 'eslint'
import stylelint from 'stylelint'
import { describe, expect, it } from 'vitest'
import eslintTokens from './eslint-tokens.mjs'
import stylelintTokens from './stylelint-tokens.mjs'

async function lintResultOf(code, option = true) {
  const result = await stylelint.lint({
    code,
    config: {
      plugins: [stylelintTokens],
      rules: { 'tokens/value-from-token': option },
    },
  })
  return result.results[0]
}

async function warningsOf(code) {
  const result = await lintResultOf(code)
  return result.warnings.map((warning) => warning.text)
}

async function writtenOutValuesOf(code) {
  const warnings = await warningsOf(code)
  return warnings.map((warning) => warning.split(' that ')[0])
}

describe('the Stylelint rule tokens/value-from-token', () => {
  it('accepts a declaration when every value is a token', async () => {
    const code = `.card {
      color: var(--text);
      background: var(--surface-raised);
      padding: var(--space-md) var(--space-lg);
      margin: 0 auto;
      font: var(--fw-strong) var(--fs-ui) / var(--lh-ui) var(--font-ui);
      gap: calc(var(--space-md) * 2);
      border: var(--hairline) solid var(--line);
      border-radius: var(--r-md);
      box-shadow: var(--shadow-sm);
      width: 100%;
      height: auto;
      min-height: 100vh;
      top: 100%;
      line-height: normal;
      color: currentcolor;
      font-family: inherit;
      background-image: url("#a1b2c3.png");
      content: "white";
      --turn: 45deg;
      font: inherit;
      font: italic var(--fw-strong) var(--fs-ui) / var(--lh-ui) var(--font-ui, var(--font-body));
      text-decoration: underline wavy var(--highlight-grammar-line);
      text-decoration-thickness: var(--hairline);
      text-underline-offset: var(--underline-offset-link);
    }`
    expect(await warningsOf(code)).toStrictEqual([])
  })

  it('reports a hex colour, a colour function and a named colour when they are written out', async () => {
    const code = '.card { color: #242424; background: rgb(0 0 0 / 5%); border-color: white; }'
    expect(await warningsOf(code)).toStrictEqual([
      '"#242424" in color is a colour that isn\'t a token. Use a colour token like var(--text) from src/browser-page/design-system/tokens/tokens.css. (tokens/value-from-token)',
      '"rgb(" in background is a colour that isn\'t a token. Use a colour token like var(--text) from src/browser-page/design-system/tokens/tokens.css. (tokens/value-from-token)',
      '"white" in border-color is a colour that isn\'t a token. Use a colour token like var(--text) from src/browser-page/design-system/tokens/tokens.css. (tokens/value-from-token)',
    ])
  })

  it('reports each form of a colour of CSS Color 4 and 5 when it is written out', async () => {
    const code =
      '.card { --a: #abc; --b: #abcd; --c: #a1b2c3d4; --d: oklch(70% 0.1 120); --e: color-mix(in srgb, var(--x), var(--y)); --f: Canvas; --g: light-dark(var(--x), var(--y)); }'
    expect(await writtenOutValuesOf(code)).toStrictEqual([
      '"#abc" in --a is a colour',
      '"#abcd" in --b is a colour',
      '"#a1b2c3d4" in --c is a colour',
      '"oklch(" in --d is a colour',
      '"color-mix(" in --e is a colour',
      '"Canvas" in --f is a colour',
      '"light-dark(" in --g is a colour',
    ])
  })

  it('reports a font size, a weight and a font family when they are written out', async () => {
    const code =
      '.card { font-size: 14px; font-weight: 700; font-family: Georgia, serif; line-height: 1.5; }'
    expect(await writtenOutValuesOf(code)).toStrictEqual([
      '"14px" in font-size is a font',
      '"700" in font-weight is a font',
      '"Georgia, serif" in font-family is a font',
      '"1.5" in line-height is a font',
    ])
  })

  it('reports a weight keyword and a font family when they are written out in the font shorthand', async () => {
    const code =
      '.card { font: var(--fs-ui) Georgia; font: bold 14px/1.5 "Helvetica Neue", system-ui; font-weight: bolder; }'
    expect(await writtenOutValuesOf(code)).toStrictEqual([
      '"Georgia" in font is a font',
      '"14px" in font is a font',
      '"1.5" in font is a font',
      '"bold" in font is a font',
      '""Helvetica Neue"" in font is a font',
      '"system-ui" in font is a font',
      '"bolder" in font-weight is a font',
    ])
  })

  it('reports the width and the offset of an underline when they are written out', async () => {
    const code =
      '.highlight { text-decoration-thickness: 1.5px; text-underline-offset: 4px; text-decoration: underline 2px; }'
    expect(await writtenOutValuesOf(code)).toStrictEqual([
      '"1.5px" in text-decoration-thickness is a border',
      '"4px" in text-underline-offset is a border',
      '"2px" in text-decoration is a border',
    ])
  })

  it('reports the colours of one value in the order they are written when a value has several colours', async () => {
    const code = '.card { background: linear-gradient(red, #000, rgb(0 0 0)); }'
    expect(await writtenOutValuesOf(code)).toStrictEqual([
      '"red" in background is a colour',
      '"#000" in background is a colour',
      '"rgb(" in background is a colour',
    ])
  })

  it('reports an invalid option and doesn’t check any value when the option isn’t true', async () => {
    const result = await lintResultOf('.card { color: #242424; }', 'always')
    expect(result.invalidOptionWarnings).toHaveLength(1)
    expect(
      result.warnings.filter((warning) => warning.rule === 'tokens/value-from-token'),
    ).toStrictEqual([])
  })

  it('reports a spacing when it is written out, also as the fallback of a token', async () => {
    const code =
      '.card { padding: 13px var(--space-md); margin-top: var(--gap, 12px); gap: .5rem; --gutter: 4px; margin: 5%; padding-bottom: 20vh; }'
    expect(await writtenOutValuesOf(code)).toStrictEqual([
      '"13px" in padding is a spacing',
      '"12px" in margin-top is a spacing',
      '".5rem" in gap is a spacing',
      '"4px" in --gutter is a spacing',
      '"5%" in margin is a spacing',
      '"20vh" in padding-bottom is a spacing',
    ])
  })

  it('reports a size, a radius, a shadow and a border width when they are written out', async () => {
    const code =
      '.card { width: 683px; max-height: 20rem; border-radius: 7px; box-shadow: 0 2px 9px var(--tint); border: 3px solid; outline-offset: -1px; }'
    expect(await writtenOutValuesOf(code)).toStrictEqual([
      '"683px" in width is a size',
      '"20rem" in max-height is a size',
      '"7px" in border-radius is a radius',
      '"2px" in box-shadow is a shadow',
      '"9px" in box-shadow is a shadow',
      '"3px" in border is a border',
      '"-1px" in outline-offset is a border',
    ])
  })
})

describe('the ESLint rule tokens/no-colour-in-string', () => {
  it('reports a colour in a string, a template and JSX text when it is written out', () => {
    const tester = new RuleTester({
      languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    })
    const error = (colour) => ({
      message: `The string contains the colour "${colour}". Use a colour token in the CSS file of the component instead, or currentcolor in an SVG.`,
    })
    expect(() =>
      tester.run('no-colour-in-string', eslintTokens.rules['no-colour-in-string'], {
        valid: [
          "const stroke = 'currentColor'",
          "const label = 'red'",
          'const width = 2',
          'const link = `#${id}`',
          "const section = '#c-1'",
        ],
        invalid: [
          { code: "const fill = '#1a8917'", errors: [error('#1a8917')] },
          { code: 'const fill = `rgb(${red} 0 0)`', errors: [error('rgb(')] },
          { code: 'const box = <p>hsl(120 50% 50%)</p>', errors: [error('hsl(')] },
          { code: 'const fill = String.raw`\\u #1a8917`', errors: [error('#1a8917')] },
        ],
      }),
    ).not.toThrow()
  })
})

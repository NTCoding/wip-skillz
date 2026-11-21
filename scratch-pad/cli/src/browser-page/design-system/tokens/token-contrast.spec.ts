import { describe, expect, it } from 'vitest'
import tokensCss from './tokens.css?raw'

interface Colour {
  readonly red: number
  readonly green: number
  readonly blue: number
  readonly alpha: number
}

interface TokenPair {
  readonly text: string
  readonly background: string
  readonly surface?: string
  readonly smallest?: number
}

const textContrast = 4.5
const largeOrFocusContrast = 3

function tokensIn(css: string): Map<string, string> {
  return new Map(
    [...css.matchAll(/(--[a-z\d][\w-]*):/gu)].map((match) => {
      const start = match.index + match[0].length
      return [String(match[1]), css.slice(start, css.indexOf(';', start)).trim()]
    }),
  )
}

const tokens = tokensIn(tokensCss)

function hexColour(hex: string): Colour {
  const digits = hex.length === 3 ? [...hex].map((digit) => `${digit}${digit}`).join('') : hex
  const [red, green, blue] = [0, 2, 4].map((at) => Number.parseInt(digits.slice(at, at + 2), 16))
  return { red: red ?? Number.NaN, green: green ?? Number.NaN, blue: blue ?? Number.NaN, alpha: 1 }
}

function rgbColour(value: string): Colour {
  const rgb = /^rgb\((\d+) (\d+) (\d+) \/ (\d+)%\)$/u.exec(value) ?? []
  const [red, green, blue, alpha] = rgb.slice(1).map(Number)
  return {
    red: red ?? Number.NaN,
    green: green ?? Number.NaN,
    blue: blue ?? Number.NaN,
    alpha: (alpha ?? Number.NaN) / 100,
  }
}

function colourOf(value: string, tokens: ReadonlyMap<string, string>): Colour {
  const reference = /^var\((--[\w-]+)\)$/u.exec(value)?.[1]
  if (reference !== undefined) {
    return colourOf(tokens.get(reference) ?? 'missing', tokens)
  }
  const hex = /^#([\da-f]{3}|[\da-f]{6})$/iu.exec(value)?.[1]
  return hex === undefined ? rgbColour(value) : hexColour(hex)
}

function over(top: Colour, bottom: Colour): Colour {
  const mix = (upper: number, lower: number): number => upper * top.alpha + lower * (1 - top.alpha)
  return {
    red: mix(top.red, bottom.red),
    green: mix(top.green, bottom.green),
    blue: mix(top.blue, bottom.blue),
    alpha: 1,
  }
}

function luminance(colour: Colour): number {
  const linear = (channel: number): number => {
    const value = channel / 255
    return value <= 0.039_28 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linear(colour.red) + 0.7152 * linear(colour.green) + 0.0722 * linear(colour.blue)
}

function contrastOf(pair: TokenPair, tokens: ReadonlyMap<string, string>): number {
  const token = (name: string): Colour => colourOf(`var(${name})`, tokens)
  const surface = token(pair.surface ?? '--surface-reading')
  const background = over(token(pair.background), surface)
  const text = over(token(pair.text), background)
  const [lighter, darker] = [luminance(text), luminance(background)].toSorted((a, b) => b - a)
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05)
}

function onSurfaces(text: string, surfaces: readonly string[], smallest = textContrast) {
  return surfaces.map((background) => ({ text, background, smallest }))
}

const frameSurfaces = [
  '--surface-reading',
  '--surface-sidebar',
  '--surface-top-bar',
  '--surface-raised',
]

const pairs = (
  [
    ...onSurfaces('--text', [...frameSurfaces, '--surface-soft', '--surface-muted']),
    ...onSurfaces('--text-2', [...frameSurfaces, '--surface-soft']),
    ...onSurfaces('--text-nav', ['--surface-sidebar', '--surface-top-bar']),
    ...onSurfaces('--text-label', ['--surface-reading', '--surface-raised']),
    ...onSurfaces('--accent', ['--surface-reading', '--surface-raised']),
    ...onSurfaces('--accent-strong', ['--surface-reading']),
    ...onSurfaces('--grammar-ink', ['--surface-raised']),
    ...onSurfaces('--improvement-ink', ['--surface-raised']),
    ...onSurfaces('--thread-sent', ['--surface-raised']),
    ...onSurfaces('--thread-replied', ['--surface-reading', '--surface-raised']),
    { text: '--text', background: '--tint' },
    { text: '--text', background: '--tint-strong' },
    { text: '--text-nav', background: '--tint', surface: '--surface-sidebar' },
    { text: '--state-doing', background: '--tint' },
    { text: '--state-todo', background: '--tint' },
    { text: '--state-done', background: '--accent-pale' },
    { text: '--text', background: '--code-inline-bg' },
    { text: '--text', background: '--highlight-comment' },
    { text: '--text', background: '--highlight-comment-active' },
    { text: '--text', background: '--highlight-grammar-active' },
    { text: '--text', background: '--highlight-improvement-active' },
    { text: '--table-head-fg', background: '--table-head-bg' },
    { text: '--warning-ink', background: '--warning-bg' },
    { text: '--thread-changed-ink', background: '--thread-changed-bg' },
    { text: '--decision-ink', background: '--decision-bg' },
    { text: '--decision-state-fg', background: '--decision-accent' },
    { text: '--decision-done-ink', background: '--decision-done-bg' },
    { text: '--decision-done-ink', background: '--accent-pale' },
    { text: '--avatar-nick-fg', background: '--avatar-nick-bg' },
    { text: '--avatar-agent-fg', background: '--avatar-agent-bg' },
    { text: '--button-primary-fg', background: '--button-primary-bg' },
    { text: '--button-primary-fg', background: '--button-primary-hover' },
    { text: '--inbox-count-fg', background: '--inbox-count-bg' },
    ...[
      '--code-fg',
      '--code-comment',
      '--code-string',
      '--code-keyword',
      '--code-number',
      '--code-fn',
      '--code-type',
      '--code-punct',
      '--code-gutter-fg',
    ].map((text) => ({ text, background: '--code-bg', smallest: textContrast })),
    { text: '--code-bar-fg', background: '--code-bar-bg', smallest: textContrast },
    { text: '--code-copy-fg', background: '--code-bar-bg', smallest: textContrast },
    {
      text: '--code-copy-hover',
      background: '--code-copy-hover-bg',
      surface: '--code-bar-bg',
      smallest: textContrast,
    },
    ...onSurfaces('--focus', frameSurfaces, largeOrFocusContrast),
    ...onSurfaces('--field-focus', ['--surface-raised'], largeOrFocusContrast),
    ...onSurfaces('--icon', frameSurfaces, largeOrFocusContrast),
  ] satisfies readonly TokenPair[]
).map((pair) => ({ smallest: textContrast, ...pair }))

describe('the contrast of the colour tokens', () => {
  it.each(pairs)('reaches $smallest to 1 when $text is drawn on $background', (pair) => {
    expect(contrastOf(pair, tokens)).toBeGreaterThanOrEqual(pair.smallest)
  })
})

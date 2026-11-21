import { coloursInCssValue } from './css-colours.mjs'

const spacingProperty =
  /^(?:margin|padding|scroll-margin|scroll-padding)(?:-.+)?$|^(?:row-|column-)?gap$/u
const offsetProperty = /^(?:inset(?:-.+)?|top|right|bottom|left)$/u
const sizeProperties = new Set([
  ...['width', 'height', 'inline-size', 'block-size'].flatMap((size) => [
    size,
    `min-${size}`,
    `max-${size}`,
  ]),
  'flex-basis',
  'grid-template-columns',
  'grid-template-rows',
  'grid-auto-columns',
  'grid-auto-rows',
])
const radiusProperty = /^border(?:-.+)?-radius$/u
const shadowProperty = /^(?:box|text)-shadow$/u
const borderSides = ['top', 'right', 'bottom', 'left', 'block', 'inline'].flatMap((side) => [
  `-${side}`,
  `-${side}-start`,
  `-${side}-end`,
])
const borderProperties = new Set([
  ...['', ...borderSides].flatMap((side) => [`border${side}`, `border${side}-width`]),
  'outline',
  'outline-width',
  'outline-offset',
  'column-rule',
  'column-rule-width',
  'text-decoration',
  'text-decoration-thickness',
  'text-underline-offset',
])
const fontSizeProperty = /^(?:font-size|letter-spacing|word-spacing|line-height)$/u

const lengthUnits = new Set(
  'px cm mm q in pt pc em rem ex rex cap rcap ch rch ic ric lh rlh cqw cqh cqi cqb cqmin cqmax'.split(
    ' ',
  ),
)
const viewportUnit = /^[sld]?v(?:w|h|i|b|min|max)$/u

const cssWideKeywords = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer'])

const quotedText = /"[^"]*"|'[^']*'/gu
const urlFunction = /url\([^)]*\)/giu
const number = /(?<![\w.#-])-?(?:\d*\.)?\d+(%|[a-z]+)?/giu
const fontWeightKeyword = /(?<![\w-])(?:bold|bolder|lighter)(?![\w-])/giu
const tokenFunction = /var\([^()]*(?:\([^()]*\)[^()]*)*\)/giu
const fontWord = /"[^"]*"|'[^']*'|(?<![\w.#-])[a-z][\w-]*/giu
const fontShorthandKeywords = new Set(
  [
    'normal italic oblique small-caps',
    'ultra-condensed extra-condensed condensed semi-condensed',
    'semi-expanded expanded extra-expanded ultra-expanded',
    'xx-small x-small small medium large x-large xx-large xxx-large larger smaller',
    'caption icon menu message-box small-caption status-bar',
    'bold bolder lighter inherit initial unset revert revert-layer',
  ]
    .join(' ')
    .split(' '),
)

function withoutTextAndUrls(value) {
  const blank = (match) => ' '.repeat(match.length)
  return value.replaceAll(quotedText, blank).replaceAll(urlFunction, blank)
}

function kindOfUnit(unit) {
  if (unit === '') {
    return 'number'
  }
  if (unit === '%') {
    return 'percentage'
  }
  if (viewportUnit.test(unit)) {
    return 'viewport'
  }
  return lengthUnits.has(unit) ? 'length' : 'other'
}

function numbersIn(value) {
  return [...value.matchAll(number)].map((match) => ({
    text: match[0],
    kind: kindOfUnit((match[1] ?? '').toLowerCase()),
    zero: Number.parseFloat(match[0]) === 0,
  }))
}

function rawNumbers(value, kinds) {
  return numbersIn(value)
    .filter((each) => kinds.includes(each.kind) && !each.zero)
    .map((each) => each.text)
}

function isOnlyATokenOrAKeyword(value) {
  const trimmed = value.trim().toLowerCase()
  return trimmed.startsWith('var(') || cssWideKeywords.has(trimmed)
}

function familiesInFontShorthand(value) {
  const withoutTokens = value.replaceAll(tokenFunction, ' ')
  return [...withoutTokens.matchAll(fontWord)]
    .map((match) => match[0])
    .filter((word) => !fontShorthandKeywords.has(word.toLowerCase()))
}

function fontTexts(property, value, checked) {
  if (property === 'font-family') {
    return isOnlyATokenOrAKeyword(value) ? [] : [value.trim()]
  }
  const keywords = [...checked.matchAll(fontWeightKeyword)].map((match) => match[0])
  if (property === 'font-weight') {
    return [...rawNumbers(checked, ['number']), ...keywords]
  }
  if (property === 'font') {
    return [
      ...rawNumbers(checked, ['number', 'length', 'percentage']),
      ...keywords,
      ...familiesInFontShorthand(value),
    ]
  }
  if (property === 'line-height') {
    return rawNumbers(checked, ['number', 'length', 'percentage'])
  }
  return fontSizeProperty.test(property) ? rawNumbers(checked, ['length', 'percentage']) : []
}

const lengthRules = [
  { pattern: spacingProperty, kind: 'spacing', units: ['length', 'percentage', 'viewport'] },
  { pattern: offsetProperty, kind: 'spacing', units: ['length'] },
  { pattern: sizeProperties, kind: 'size', units: ['length'] },
  { pattern: radiusProperty, kind: 'radius', units: ['length', 'percentage'] },
  { pattern: shadowProperty, kind: 'shadow', units: ['length'] },
  { pattern: borderProperties, kind: 'border', units: ['length'] },
  { pattern: /^--/u, kind: 'spacing', units: ['length'] },
]

function lengthValues(property, value) {
  const rule = lengthRules.find((each) =>
    each.pattern instanceof Set ? each.pattern.has(property) : each.pattern.test(property),
  )
  return rule === undefined
    ? []
    : rawNumbers(value, rule.units).map((text) => ({ kind: rule.kind, text }))
}

/** The values of a declaration that are written out where a token belongs, with the kind of each value. */
export function valuesThatNeedATokenIn(property, value) {
  const name = property.toLowerCase()
  const checked = withoutTextAndUrls(value)
  const colours = coloursInCssValue(checked).map((colour) => ({
    kind: 'colour',
    text: colour.text,
  }))
  const fonts = fontTexts(name, value, checked).map((text) => ({
    kind: 'font',
    text,
  }))
  return [...colours, ...fonts, ...lengthValues(name, checked)]
}

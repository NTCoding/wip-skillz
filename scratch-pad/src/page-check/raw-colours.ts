const hexColour = /#[\da-f]{3,8}(?![\w-])/giu

const hexColourLengths = new Set([4, 5, 7, 9])

const colourFunctionNames = [
  'rgb',
  'rgba',
  'hsl',
  'hsla',
  'hwb',
  'lab',
  'lch',
  'oklab',
  'oklch',
  'color',
  'color-mix',
  'light-dark',
  'device-cmyk',
  'contrast-color',
]

const colourFunction = new RegExp(`(?<![\\w-])(?:${colourFunctionNames.join('|')})\\(`, 'giu')

const urlFunction = /url\([^)]*\)/giu

const namedColours = new Set(
  [
    'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue',
    'blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk',
    'crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki',
    'darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen',
    'darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue',
    'dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite',
    'gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki',
    'lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan',
    'lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen',
    'lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen',
    'magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen',
    'mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream',
    'mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid',
    'palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum',
    'powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown',
    'seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen',
    'steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow',
    'yellowgreen',
  ]
    .join(' ')
    .split(' '),
)

const word = /(?<![\w#.-])[a-z]+(?![\w(-])/giu

const styleAttribute = /\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/giu

const colourAttribute =
  /\s(?:fill|stroke|color|bgcolor|stop-color|flood-color|lighting-color)\s*=\s*(?:"([^"]*)"|'([^']*)')/giu

const styleElement = /<style[^>]*>([\s\S]*?)<\/style>/giu

function matchesIn(pattern: RegExp, text: string): string[] {
  return [...text.matchAll(pattern)].map((match) => match[0])
}

function groupsOf(pattern: RegExp, text: string): string[] {
  return [...text.matchAll(pattern)].map((match) => match.slice(1).join(''))
}

function functionCallAt(text: string, start: number): string {
  const depth = { open: 0 }
  const end = [...text.slice(start)].findIndex((character) => {
    depth.open += character === '(' ? 1 : 0
    depth.open -= character === ')' ? 1 : 0
    return character === ')' && depth.open === 0
  })
  return end === -1 ? text.slice(start) : text.slice(start, start + end + 1)
}

function coloursInCssValue(value: string): string[] {
  const css = value.replaceAll(urlFunction, '')
  const hex = matchesIn(hexColour, css).filter((colour) => hexColourLengths.has(colour.length))
  const functions = [...css.matchAll(colourFunction)].map((match) =>
    functionCallAt(css, match.index),
  )
  const named = matchesIn(word, css).filter((name) => namedColours.has(name.toLowerCase()))
  return [...hex, ...functions, ...named]
}

function declarationValues(css: string): string[] {
  return css.split(/[;{}]/u).flatMap((declaration) => {
    const colon = declaration.indexOf(':')
    return colon === -1 ? [] : [declaration.slice(colon + 1)]
  })
}

// The CSS of an html block is in its style attributes, its colour attributes and its style
// elements. The text and the links of the block aren't CSS, like "#fade" in an href.
export function rawColoursInHtml(html: string): string[] {
  const values = [
    ...groupsOf(styleAttribute, html).flatMap(declarationValues),
    ...groupsOf(colourAttribute, html),
    ...groupsOf(styleElement, html).flatMap(declarationValues),
  ]
  return [...new Set(values.flatMap(coloursInCssValue))]
}

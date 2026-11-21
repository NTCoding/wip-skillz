// Finds a colour that is written out in full. CSS Color Module Level 4 and Level 5 define the forms of a colour.

const notPartOfAWord = '(?![\\w-])'

const hexColour = new RegExp(
  `#(?:(?:[\\da-f]{4}){1,2}|(?:[\\da-f]{3}){1,2})${notPartOfAWord}`,
  'giu',
)

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
    'accentcolor accentcolortext activetext buttonborder buttonface buttontext canvas',
    'canvastext field fieldtext graytext highlight highlighttext linktext mark marktext',
    'selecteditem selecteditemtext visitedtext',
  ]
    .join(' ')
    .split(' '),
)

const identifier = /(?<![\w#-])[a-z][a-z-]*(?![\w(-])/giu

function found(pattern, text) {
  return [...text.matchAll(pattern)].map((match) => ({ text: match[0], index: match.index }))
}

function inOrder(first, second) {
  return first.index - second.index
}

/** The hex colours and the colour functions in a text, like a string of TypeScript. */
export function colourLiteralsIn(text) {
  return [...found(hexColour, text), ...found(colourFunction, text)].toSorted(inOrder)
}

/** The colours in a CSS value, which can also contain the name of a colour. */
export function coloursInCssValue(value) {
  const named = found(identifier, value).filter((word) => namedColours.has(word.text.toLowerCase()))
  return [...colourLiteralsIn(value), ...named].toSorted(inOrder)
}

type TextPiece = Text | 'separator'

const separatedTags = new Set([
  'ADDRESS',
  'BLOCKQUOTE',
  'BR',
  'DD',
  'DIV',
  'DL',
  'DT',
  'FIGURE',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'HR',
  'LI',
  'OL',
  'P',
  'PRE',
  'SECTION',
  'TABLE',
  'TBODY',
  'TD',
  'TFOOT',
  'TH',
  'THEAD',
  'TR',
  'UL',
])

const tagsWithoutPageText = new Set([
  'BUTTON',
  'EMBED',
  'FIGCAPTION',
  'IFRAME',
  'INPUT',
  'OBJECT',
  'SCRIPT',
  'STYLE',
  'TEXTAREA',
])

function textPiecesOf(node: Node): TextPiece[] {
  if (node instanceof Text) {
    return [node]
  }
  if (!(node instanceof Element) || tagsWithoutPageText.has(node.tagName)) {
    return []
  }
  const inside = [...node.childNodes].flatMap(textPiecesOf)
  return separatedTags.has(node.tagName) ? ['separator', ...inside, 'separator'] : inside
}

function textInside(range: Range, node: Text): string {
  if (!range.intersectsNode(node)) {
    return ''
  }
  const start = node === range.startContainer ? range.startOffset : 0
  const end = node === range.endContainer ? range.endOffset : node.length
  return node.data.slice(start, end)
}

export function visibleTextOf(block: Element, range: Range): string {
  return textPiecesOf(block)
    .map((piece) => (piece === 'separator' ? ' ' : textInside(range, piece)))
    .join('')
}

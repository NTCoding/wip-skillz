import { type ReactNode } from 'react'
import { type ThreadType } from './api-responses'
import { Highlight } from './design-system/design-system'
import { headingTags } from './page-elements'
import { taskReferenceScheme } from './task-references'

export interface TextHighlight {
  readonly thread: string
  readonly kind: ThreadType
  readonly active: boolean
  readonly blockLines: string
  readonly selectedText: string
  readonly occurrence: number
}

interface TextSpan {
  readonly node: Text
  readonly start: number
  readonly end: number
}

interface CharacterPosition {
  readonly node: Text
  readonly offset: number
}

// After Nick has opened a result of the search, the page highlights every copy of the query in the
// text under the heading of the result. A result without a heading id is before the first heading.
export interface SearchMatchOnPage {
  readonly headingId: string | undefined
  readonly query: string
}

const searchMatch = 'search match'

interface MarkedSpan extends TextSpan {
  readonly highlight: TextHighlight | typeof searchMatch
}

const whitespace = /\s/
const hiddenTags = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED'])

function withoutWhitespace(text: string): string {
  return text.replaceAll(/\s+/g, '')
}

// The text of a task reference, like task:t-4, isn't part of the text that a thread is attached
// to, which visible-text.ts explains.
function textNodesOf(node: Node): Text[] {
  if (node instanceof Text) {
    return [node]
  }
  if (
    node instanceof Element &&
    (hiddenTags.has(node.tagName) ||
      String(node.getAttribute('href')).startsWith(taskReferenceScheme))
  ) {
    return []
  }
  return [...node.childNodes].flatMap(textNodesOf)
}

function visiblePositions(nodes: readonly Text[]): CharacterPosition[] {
  return nodes.flatMap((node) =>
    node.data
      .split('')
      .flatMap((character, offset) => (whitespace.test(character) ? [] : [{ node, offset }])),
  )
}

function placeOf(text: string, target: string, occurrence: number, from = 0): number {
  const found = text.indexOf(target, from)
  return occurrence === 0 || found === -1
    ? found
    : placeOf(text, target, occurrence - 1, found + target.length)
}

export function occurrenceAfter(textBefore: string, selectedText: string): number {
  const target = withoutWhitespace(selectedText)
  const start = withoutWhitespace(textBefore).length
  const text = `${withoutWhitespace(textBefore)}${target}`
  const countFrom = (from: number, count: number): number => {
    const found = text.indexOf(target, from)
    return found === -1 || found >= start ? count : countFrom(found + target.length, count + 1)
  }
  return target === '' ? 0 : countFrom(0, 0)
}

function visibleText(positions: readonly CharacterPosition[]): string {
  return positions.map((position) => position.node.data[position.offset]).join('')
}

export function selectedTextIn(
  block: Element,
  selectedText: string,
  occurrence = 0,
): TextSpan[] | undefined {
  const target = withoutWhitespace(selectedText)
  const nodes = textNodesOf(block)
  const positions = visiblePositions(nodes)
  const at = placeOf(visibleText(positions), target, occurrence)
  return spansBetween(nodes, positions[at], positions[at + target.length - 1])
}

function spansBetween(
  nodes: readonly Text[],
  first: CharacterPosition | undefined,
  last: CharacterPosition | undefined,
): TextSpan[] | undefined {
  if (first === undefined || last === undefined) {
    return undefined
  }
  const covered = nodes.slice(nodes.indexOf(first.node), nodes.indexOf(last.node) + 1)
  return covered.map((node) => ({
    node,
    start: node === first.node ? first.offset : 0,
    end: node === last.node ? last.offset + 1 : node.length,
  }))
}

function topLevelBlock(body: Element, lines: string): Element | undefined {
  return [...body.children].find((child) => child.getAttribute('data-lines') === lines)
}

function markedSpans(body: Element, highlight: TextHighlight): MarkedSpan[] {
  const block = topLevelBlock(body, highlight.blockLines)
  const spans =
    block === undefined
      ? undefined
      : selectedTextIn(block, highlight.selectedText, highlight.occurrence)
  return (spans ?? []).map((span) => ({ ...span, highlight }))
}

// The query is matched in the same way as the server matches it, without upper or lower case. The
// whitespace is left out, in the same way as for the selected text of a thread.
function queryCopiesIn(block: Element, query: string): TextSpan[] {
  const target = withoutWhitespace(query)
  if (target === '') {
    return []
  }
  const nodes = textNodesOf(block)
  const positions = visiblePositions(nodes)
  const pattern = new RegExp(target.replaceAll(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`), 'giu')
  return [...visibleText(positions).matchAll(pattern)].flatMap((match) =>
    spansOver(positions.slice(match.index, match.index + match[0].length)),
  )
}

// Each text node that contains a part of the copy has one span, from the first character of the
// copy in that node to the last one.
function spansOver(covered: readonly CharacterPosition[]): TextSpan[] {
  return [...new Set(covered.map((position) => position.node))].map((node) => {
    const offsets = covered
      .filter((position) => position.node === node)
      .map((position) => position.offset)
    return { node, start: Math.min(...offsets), end: Math.max(...offsets) + 1 }
  })
}

// The blocks under a heading start with the heading itself and end before the next heading. Without
// a heading id, the blocks are the ones before the first heading. A decision block is left out,
// because the search skips the decisions.
function blocksUnder(body: Element, headingId: string | undefined): Element[] {
  const blocks = [...body.children]
  const isHeading = (block: Element): boolean => headingTags.has(block.tagName)
  const start =
    headingId === undefined
      ? -1
      : blocks.findIndex((block) => isHeading(block) && block.id === headingId)
  if (headingId !== undefined && start === -1) {
    return []
  }
  const next = blocks.findIndex((block, index) => index > start && isHeading(block))
  const end = next === -1 ? blocks.length : next
  return blocks
    .slice(Math.max(start, 0), end)
    .filter((block) => !block.classList.contains('decision'))
}

function searchSpans(body: Element, match: SearchMatchOnPage | undefined): MarkedSpan[] {
  return match === undefined
    ? []
    : blocksUnder(body, match.headingId)
        .flatMap((block) => queryCopiesIn(block, match.query))
        .map((span) => ({ ...span, highlight: searchMatch }))
}

// A search match is shown over the highlight of a thread. The highlight keeps the ids of the threads
// so that their cards are still placed beside the text.
function pieceOf(node: Text, spans: readonly MarkedSpan[], start: number, end: number): ReactNode {
  const text = node.data.slice(start, end)
  const covering = spans.filter((span) => span.start <= start && span.end >= end)
  const threads = covering.flatMap((span) =>
    span.highlight === searchMatch ? [] : [span.highlight],
  )
  const shown = threads.find((highlight) => highlight.active) ?? threads[0]
  const searched = covering.length > threads.length
  if (covering.length === 0) {
    return text
  }
  return (
    <Highlight
      key={start}
      threads={threads.map((highlight) => highlight.thread)}
      kind={shown === undefined || searched ? 'search' : shown.kind}
      active={threads.some((highlight) => highlight.active)}
    >
      {text}
    </Highlight>
  )
}

function piecesOf(node: Text, spans: readonly MarkedSpan[]): readonly ReactNode[] {
  const cuts = [...new Set([node.length, ...spans.flatMap((span) => [span.start, span.end])])]
    .filter((cut) => cut > 0)
    .toSorted((first, second) => first - second)
  return cuts.reduce<{ readonly start: number; readonly pieces: readonly ReactNode[] }>(
    (done, end) => ({
      start: end,
      pieces: [...done.pieces, pieceOf(node, spans, done.start, end)],
    }),
    { start: 0, pieces: [] },
  ).pieces
}

export function highlightedTexts(
  body: Element,
  highlights: readonly TextHighlight[],
  match?: SearchMatchOnPage,
): ReadonlyMap<Node, readonly ReactNode[]> {
  const spans = [
    ...highlights.flatMap((highlight) => markedSpans(body, highlight)),
    ...searchSpans(body, match),
  ]
  const nodes = [...new Set(spans.map((span) => span.node))]
  return new Map(
    nodes.map((node) => [
      node,
      piecesOf(
        node,
        spans.filter((span) => span.node === node),
      ),
    ]),
  )
}

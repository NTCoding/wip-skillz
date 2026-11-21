import { type ReactNode } from 'react'
import { type ThreadType } from './api-responses'
import { Highlight } from './design-system/design-system'

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

interface MarkedSpan extends TextSpan {
  readonly highlight: TextHighlight
}

const whitespace = /\s/
const hiddenTags = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED'])

function withoutWhitespace(text: string): string {
  return text.replaceAll(/\s+/g, '')
}

function textNodesOf(node: Node): Text[] {
  if (node instanceof Text) {
    return [node]
  }
  if (node instanceof Element && hiddenTags.has(node.tagName)) {
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

export function selectedTextIn(
  block: Element,
  selectedText: string,
  occurrence = 0,
): TextSpan[] | undefined {
  const target = withoutWhitespace(selectedText)
  const nodes = textNodesOf(block)
  const positions = visiblePositions(nodes)
  const at = placeOf(
    positions.map((position) => position.node.data[position.offset]).join(''),
    target,
    occurrence,
  )
  const first = positions[at]
  const last = positions[at + target.length - 1]
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

function pieceOf(node: Text, spans: readonly MarkedSpan[], start: number, end: number): ReactNode {
  const text = node.data.slice(start, end)
  const covering = spans
    .filter((span) => span.start <= start && span.end >= end)
    .map((span) => span.highlight)
  const shown = covering.find((highlight) => highlight.active) ?? covering[0]
  return shown === undefined ? (
    text
  ) : (
    <Highlight
      key={start}
      threads={covering.map((highlight) => highlight.thread)}
      kind={shown.kind}
      active={covering.some((highlight) => highlight.active)}
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
): ReadonlyMap<Node, readonly ReactNode[]> {
  const spans = highlights.flatMap((highlight) => markedSpans(body, highlight))
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

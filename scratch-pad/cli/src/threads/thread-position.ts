import { normalisedText, type PageBlock } from '../rendered-page/page-blocks'
import { contextAfter, contextBefore, contextLength } from './anchor-context'
import { exactMatches, textSimilarity } from './quote-match'
import { searchedPageOf, type FoundQuote, type SearchedPage } from './searched-page'
import { type Anchor, type Thread } from './thread'

export type ThreadPosition =
  | {
      readonly kind: 'attached'
      readonly firstLine: number
      readonly lastLine: number
      readonly text: string
      readonly occurrence: number
      readonly match: 'exact' | 'fuzzy'
      readonly score: number
    }
  | { readonly kind: 'detached' }

export interface PositionedThread extends Thread {
  readonly position: ThreadPosition | undefined
}

interface AnchorContext {
  readonly prefix: string
  readonly suffix: string
}

interface Candidate extends FoundQuote {
  readonly context: number
  readonly longSideContext: number
  readonly score: number
}

const detached: ThreadPosition = { kind: 'detached' }
const shortQuoteLength = 16
const shortestKeptSide = 16
const strongContext = 0.9
const lowestShortQuoteContext = 0.75
const lowestFuzzyContext = 0.75
const lowestContext = 0.5
const lightestContextWeight = 0.25
const linesNearWithoutContext = 3

const rememberedPositions = new WeakMap<SearchedPage, Map<string, ThreadPosition>>()

export function currentPosition(anchor: Anchor, markdown: string): ThreadPosition {
  const page = searchedPageOf(markdown)
  const positions = rememberedPositions.get(page) ?? new Map<string, ThreadPosition>()
  rememberedPositions.set(page, positions)
  const key = JSON.stringify(anchor)
  const position = positions.get(key) ?? positionIn(page, anchor)
  positions.set(key, position)
  return position
}

export function positionedThread(thread: Thread, markdown: string): PositionedThread {
  return {
    ...thread,
    position: thread.anchor === undefined ? undefined : currentPosition(thread.anchor, markdown),
  }
}

export function copiesOnPage(selectedText: string, markdown: string): number {
  return searchedPageOf(markdown).exactCopies(normalisedText(selectedText)).length
}

function positionIn(page: SearchedPage, anchor: Anchor): ThreadPosition {
  const quote = normalisedText(anchor.selectedText)
  const exact = page.exactCopies(quote)
  const { prefix, suffix } = anchor
  if (prefix === undefined || suffix === undefined) {
    return positionWithoutContext(page, anchor, quote, exact)
  }
  const context = { prefix: normalisedText(prefix), suffix: normalisedText(suffix) }
  const exactCandidates = exact.map((found) => candidateOf(context, found))
  const [sameContext] = ranked(anchor, exactCandidates.filter(hasStrongContext))
  if (sameContext !== undefined) {
    return positionOf(sameContext, sameContext.score)
  }
  const fuzzy = page
    .similarCopies(quote)
    .filter((found) => !exact.some((copy) => overlaps(copy, found)))
    .map((found) => candidateOf(context, found))
  const stillUnique = anchor.copiesOnPage === 1 && exact.length === 1
  const shortQuote = [...quote].length < shortQuoteLength
  const exactContext = shortQuote ? lowestShortQuoteContext : lowestContext
  const keepsUniqueCopy = (candidate: Candidate): boolean =>
    stillUnique && (!shortQuote || candidate.longSideContext >= strongContext)
  const [best] = [
    fuzzy.filter(hasStrongContext),
    exactCandidates.filter(
      (candidate) => keepsUniqueCopy(candidate) || candidate.context >= exactContext,
    ),
    fuzzy.filter((candidate) => candidate.context >= lowestFuzzyContext),
  ]
    .map((tier) => ranked(anchor, tier))
    .flat()
  return best === undefined ? detached : positionOf(best, best.score)
}

function positionWithoutContext(
  page: SearchedPage,
  anchor: Anchor,
  quote: string,
  exact: readonly FoundQuote[],
): ThreadPosition {
  const [only, ...others] = exact.length > 0 ? exact : page.similarCopies(quote)
  return only !== undefined && others.length === 0 && isNear(only.block, anchor)
    ? positionOf(only, only.found.similarity)
    : detached
}

function isNear(block: PageBlock, anchor: Anchor): boolean {
  return (
    block.lastLine >= anchor.firstLine - linesNearWithoutContext &&
    block.firstLine <= anchor.lastLine + linesNearWithoutContext
  )
}

function candidateOf(stored: AnchorContext, { block, found }: FoundQuote): Candidate {
  const sides = [
    sideOf(stored.prefix, contextBefore(block.text.slice(0, found.start))),
    sideOf(stored.suffix, contextAfter(block.text.slice(found.end))),
  ]
  const weight = sides.reduce((total, side) => total + side.weight, 0)
  const context = sides.reduce((total, side) => total + side.weight * side.similarity, 0) / weight
  const longSideContext = Math.max(
    0,
    ...sides.filter((side) => side.length >= shortestKeptSide).map((side) => side.similarity),
  )
  return { block, found, context, longSideContext, score: (3 * found.similarity + context) / 4 }
}

interface ContextSide {
  readonly similarity: number
  readonly weight: number
  readonly length: number
}

function sideOf(stored: string, near: string): ContextSide {
  const length = [...stored].length
  const weight = Math.min(1, Math.max(lightestContextWeight, length / contextLength))
  return { similarity: textSimilarity(stored, near), weight, length }
}

function hasStrongContext(candidate: Candidate): boolean {
  return candidate.context >= strongContext
}

function ranked(anchor: Anchor, candidates: readonly Candidate[]): Candidate[] {
  const distance = (candidate: Candidate): number =>
    Math.abs(candidate.block.firstLine - anchor.firstLine)
  return candidates.toSorted(
    (first, second) => second.score - first.score || distance(first) - distance(second),
  )
}

function overlaps(first: FoundQuote, second: FoundQuote): boolean {
  return (
    first.block === second.block &&
    first.found.start < second.found.end &&
    second.found.start < first.found.end
  )
}

function positionOf({ block, found }: FoundQuote, score: number): ThreadPosition {
  const text = block.text.slice(found.start, found.end)
  return {
    kind: 'attached',
    firstLine: block.firstLine,
    lastLine: block.lastLine,
    text,
    occurrence: exactMatches(text, block.text.slice(0, found.start)).length,
    match: found.similarity === 1 ? 'exact' : 'fuzzy',
    score: Math.round(score * 100) / 100,
  }
}

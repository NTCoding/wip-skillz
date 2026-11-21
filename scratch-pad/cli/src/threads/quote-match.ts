export interface QuoteMatch {
  readonly start: number
  readonly end: number
  readonly similarity: number
}

interface SpanEnd {
  readonly start: number
  readonly end: number
  readonly cost: number
}

interface MatchColumns {
  readonly costs: Int32Array
  readonly starts: Int32Array
  readonly nextCosts: Int32Array
  readonly nextStarts: Int32Array
  readonly unreachable: number
}

const lowestQuoteSimilarity = 0.75

const segmenter = new Intl.Segmenter('en', { granularity: 'word' })

export function exactMatches(quote: string, text: string): QuoteMatch[] {
  return quote === '' || !text.includes(quote)
    ? []
    : [...text.matchAll(new RegExp(escapedPattern(quote), 'g'))].map((found) => ({
        start: found.index,
        end: found.index + quote.length,
        similarity: 1,
      }))
}

export function allowedEdits(quote: string): number {
  return Math.floor(quote.length * (1 - lowestQuoteSimilarity))
}

export function wordBoundariesOf(text: string): Uint8Array {
  const boundaries = new Uint8Array(text.length + 1)
  boundaries[text.length] = 1
  for (const segment of segmenter.segment(text)) {
    boundaries[segment.index] = 1
  }
  return boundaries
}

export function similarMatches(quote: string, text: string, boundaries: Uint8Array): QuoteMatch[] {
  return bestOfOverlapping(spanEndsOf(quote, text, boundaries))
    .map((span) => trimmedSpan(span, text))
    .map((span) => ({
      start: span.start,
      end: span.end,
      similarity: textSimilarity(quote, text.slice(span.start, span.end)),
    }))
    .filter((found) => found.similarity >= lowestQuoteSimilarity)
}

function spanEndsOf(quote: string, text: string, boundaries: Uint8Array): SpanEnd[] {
  const size = quote.length + 1
  const unreachable = quote.length + text.length + 1
  const columns: MatchColumns = {
    costs: Int32Array.from({ length: size }, (_, position) => position),
    starts: new Int32Array(size),
    nextCosts: new Int32Array(size),
    nextStarts: new Int32Array(size),
    unreachable,
  }
  const quoteCodes = Uint16Array.from({ length: quote.length }, (_, at) => quote.charCodeAt(at))
  const allowed = allowedEdits(quote)
  const ends: SpanEnd[] = []
  Uint16Array.from({ length: text.length }, (_, at) => text.charCodeAt(at)).forEach(
    (character, index) => {
      const column = index + 1
      advanceColumn(columns, quoteCodes, character, column, boundaries[column] === 1)
      const cost = Number(columns.costs[quote.length])
      if (boundaries[column] === 1 && cost <= allowed) {
        ends.push({ start: Number(columns.starts[quote.length]), end: column, cost })
      }
    },
  )
  return ends
}

function advanceColumn(
  columns: MatchColumns,
  quoteCodes: Uint16Array,
  character: number,
  column: number,
  startAllowed: boolean,
): void {
  const { costs, starts, nextCosts, nextStarts } = columns
  nextCosts[0] = startAllowed ? 0 : columns.unreachable
  nextStarts[0] = column
  quoteCodes.forEach((quoteCode, position) => {
    const replace = Number(costs[position]) + Number(quoteCode !== character)
    const skipText = Number(costs[position + 1]) + 1
    const skipQuote = Number(nextCosts[position]) + 1
    const cheapest = Math.min(replace, skipText, skipQuote)
    nextCosts[position + 1] = cheapest
    nextStarts[position + 1] = Number(
      startOfCheapest(cheapest, { replace, skipQuote }, columns, position),
    )
  })
  costs.set(nextCosts)
  starts.set(nextStarts)
}

function startOfCheapest(
  cheapest: number,
  costs: { readonly replace: number; readonly skipQuote: number },
  columns: MatchColumns,
  position: number,
): number | undefined {
  if (cheapest === costs.replace) {
    return columns.starts[position]
  }
  return cheapest === costs.skipQuote ? columns.nextStarts[position] : columns.starts[position + 1]
}

function bestOfOverlapping(ends: readonly SpanEnd[]): SpanEnd[] {
  return ends.reduce<SpanEnd[]>((groups, next) => {
    const current = groups.at(-1)
    if (current === undefined || next.start >= current.end) {
      groups.push(next)
    } else if (next.cost <= current.cost) {
      groups.splice(-1, 1, next)
    }
    return groups
  }, [])
}

function trimmedSpan(span: SpanEnd, text: string): SpanEnd {
  const found = text.slice(span.start, span.end)
  const start = span.start + found.length - found.trimStart().length
  const end = span.end - (found.length - found.trimEnd().length)
  return { ...span, start, end: Math.max(start, end) }
}

export function textSimilarity(first: string, second: string): number {
  const longest = Math.max(first.length, second.length)
  return longest === 0 ? 1 : similarityOf(editDistance(first, second), longest)
}

function editDistance(first: string, second: string): number {
  const row = Int32Array.from({ length: second.length + 1 }, (_, position) => position)
  const nextRow = new Int32Array(row.length)
  const secondCodes = Uint16Array.from({ length: second.length }, (_, at) => second.charCodeAt(at))
  Uint16Array.from({ length: first.length }, (_, at) => first.charCodeAt(at)).forEach(
    (character, index) => {
      nextRow[0] = index + 1
      secondCodes.forEach((other, position) => {
        nextRow[position + 1] = Math.min(
          Number(row[position]) + Number(character !== other),
          Number(row[position + 1]) + 1,
          Number(nextRow[position]) + 1,
        )
      })
      row.set(nextRow)
    },
  )
  return Number(row[second.length])
}

function similarityOf(distance: number, length: number): number {
  return 1 - distance / length
}

function escapedPattern(text: string): string {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}

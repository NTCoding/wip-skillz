import { describe, expect, it } from 'vitest'
import { pageBlocksOf } from '../rendered-page/page-blocks'
import { contextAfter, contextBefore } from './anchor-context'
import { exactMatches } from './quote-match'
import { type Anchor } from './thread'
import { aThread } from './thread-fixtures'
import { copiesOnPage, currentPosition, positionedThread } from './thread-position'

const exportPage = [
  '# Invoice export',
  '',
  '## Retry policy',
  '',
  'The export job runs every night. It retries 5 times when the network of a shop is slow.',
  'Each retry waits 30 seconds.',
  '',
  '## Invoice template',
  '',
  'The template shows the tax number of the shop.',
]

const retrySentence = 'It retries 5 times when the network of a shop is slow.'

function anchorIn(lines: readonly string[], selectedText: string, copy = 0): Anchor {
  const markdown = lines.join('\n')
  const copies = pageBlocksOf(markdown).flatMap((block) =>
    exactMatches(selectedText, block.text).map((found) => ({ block, found })),
  )
  const { block, found } = copies[copy] ?? {
    block: { firstLine: 1, lastLine: 1, text: '' },
    found: { start: 0, end: 0 },
  }
  return {
    firstLine: block.firstLine,
    lastLine: block.lastLine,
    selectedText,
    prefix: contextBefore(block.text.slice(0, found.start)),
    suffix: contextAfter(block.text.slice(found.end)),
    copiesOnPage: copies.length,
  }
}

function positionIn(lines: readonly string[], anchor = anchorIn(exportPage, retrySentence)) {
  return currentPosition(anchor, lines.join('\n'))
}

describe('currentPosition', () => {
  it('returns the original lines with an exact match when the page is unchanged', () => {
    expect(positionIn(exportPage)).toStrictEqual({
      kind: 'attached',
      firstLine: 5,
      lastLine: 6,
      text: retrySentence,
      occurrence: 0,
      match: 'exact',
      score: 1,
    })
  })

  it('returns the lines below when a sentence is added above the paragraph', () => {
    const edited = [
      ...exportPage.slice(0, 4),
      'A short note about the export job.',
      '',
      ...exportPage.slice(4),
    ]
    expect(positionIn(edited)).toMatchObject({ firstLine: 7, lastLine: 8, match: 'exact' })
  })

  it('returns a fuzzy match on the new wording when a word inside the quote changes', () => {
    const edited = exportPage.map((line) => line.replace('5 times', '8 times'))
    expect(positionIn(edited)).toStrictEqual({
      kind: 'attached',
      firstLine: 5,
      lastLine: 6,
      text: 'It retries 8 times when the network of a shop is slow.',
      occurrence: 0,
      match: 'fuzzy',
      score: 0.99,
    })
  })

  it('returns the lines in the other section when the paragraph is moved', () => {
    const edited = [
      ...exportPage.slice(0, 4),
      ...exportPage.slice(7),
      '',
      ...exportPage.slice(4, 6),
    ]
    expect(positionIn(edited)).toMatchObject({ firstLine: 9, lastLine: 10, match: 'exact' })
  })

  it('follows the quote into the second paragraph when the paragraph is split in 2', () => {
    const edited = [
      ...exportPage.slice(0, 4),
      'The export job runs every night.',
      '',
      `${retrySentence} Each retry waits 30 seconds.`,
      ...exportPage.slice(6),
    ]
    expect(positionIn(edited)).toMatchObject({ firstLine: 7, lastLine: 7, score: 0.87 })
  })

  it('returns detached when the quote is deleted', () => {
    const edited = exportPage.map((line) => line.replace(retrySentence, ''))
    expect(positionIn(edited)).toStrictEqual({ kind: 'detached' })
  })

  it('returns detached when the page only has a rule', () => {
    expect(positionIn(['---'])).toStrictEqual({ kind: 'detached' })
  })

  it('returns detached when the quote is rewritten', () => {
    const edited = exportPage.map((line) =>
      line.replace(retrySentence, 'A slow shop is tried again up to 8 times.'),
    )
    expect(positionIn(edited)).toStrictEqual({ kind: 'detached' })
  })

  it('returns detached when the selected text is empty', () => {
    expect(positionIn(exportPage, { ...anchorIn(exportPage, ''), selectedText: '' })).toStrictEqual(
      { kind: 'detached' },
    )
  })

  it('returns the same position again when the same page is read twice', () => {
    const page = exportPage.map((line) => line.replace('5 times', '6 times'))
    expect(positionIn(page)).toBe(positionIn(page))
  })
})

describe('currentPosition with 2 identical quotes', () => {
  const twoQuotes = [
    'The export job retries 5 times.',
    '',
    'The import job retries 5 times.',
    '',
    'The cleanup job retries 5 times and then gives up.',
  ]

  it('picks the quote whose context matches when the same text is in 2 paragraphs', () => {
    const anchor = anchorIn(twoQuotes, 'retries 5 times', 1)
    expect(positionIn(['A new first line.', '', ...twoQuotes], anchor)).toMatchObject({
      firstLine: 5,
      match: 'exact',
    })
  })

  it('picks the quote nearest to the old lines when the contexts match equally', () => {
    const page = ['The job stops.', '', 'The job stops.', '', 'The job stops.']
    const anchor = anchorIn(page, 'job', 1)
    expect(positionIn(page, anchor)).toMatchObject({ firstLine: 3, score: 1 })
  })

  it('counts the earlier copies in the same block when the quote is there twice', () => {
    const page = ['First the job starts. Then the job stops.']
    expect(positionIn(page, anchorIn(page, 'the job', 1))).toMatchObject({
      text: 'the job',
      occurrence: 1,
    })
  })

  it('returns detached when the commented copy is deleted and the other copy has another context', () => {
    const page = [
      'Run the export job again after the fix. The shop list is in the config.',
      '',
      'The report is sent at noon. Run the export job again after the fix. Nobody reads it.',
    ]
    const anchor = anchorIn(page, 'Run the export job again after the fix.', 1)
    const edited = [...page.slice(0, 2), 'The report is sent at noon. Nobody reads it.']
    expect(positionIn(edited, anchor)).toStrictEqual({ kind: 'detached' })
  })

  it('returns the edited copy when the second copy in a paragraph is edited and the first is not', () => {
    const page = ['Berlin retries 3 times when slow. Paris retries 3 times when slow.']
    const anchor = anchorIn(page, 'retries 3 times when slow', 1)
    const edited = ['Berlin retries 3 times when slow. Paris retries 4 times when slow.']
    expect(positionIn(edited, anchor)).toMatchObject({
      text: 'retries 4 times when slow',
      match: 'fuzzy',
      occurrence: 0,
    })
  })
})

describe('currentPosition in a table', () => {
  const table = [
    '| Shop | Retries |',
    '|---|---|',
    '| Berlin | 5 times when slow |',
    '| Paris | 3 times when slow |',
  ]
  const anchor = anchorIn(table, '3 times when slow')

  it('returns the edited row when the commented row is edited', () => {
    const edited = table.map((line) => line.replace('3 times', '4 times'))
    expect(positionIn(edited, anchor)).toMatchObject({ text: '4 times when slow', match: 'fuzzy' })
  })

  it('returns detached when the commented row is deleted', () => {
    expect(positionIn(table.slice(0, 3), anchor)).toStrictEqual({ kind: 'detached' })
  })

  it('returns detached when the commented row is deleted and another row has the same text', () => {
    const twoRows = table.map((line) => line.replace('5 times', '3 times'))
    const second = anchorIn(twoRows, '3 times when slow', 1)
    expect(positionIn(twoRows.slice(0, 3), second)).toStrictEqual({ kind: 'detached' })
  })

  it('follows the row when the rows are swapped and the quote is unique', () => {
    const swapped = [...table.slice(0, 2), ...table.slice(2).toReversed()]
    expect(positionIn(swapped, anchor)).toMatchObject({
      text: '3 times when slow',
      match: 'exact',
    })
  })
})

describe('currentPosition at the start or the end of a block', () => {
  const page = [
    '## Scheduling',
    '',
    'The export job is slow on Mondays. Nick wants a faster job.',
    '',
    'Mondays are busy for the finance team.',
  ]

  it('returns detached when a heading is deleted and its word starts a paragraph', () => {
    const edited = ['Scheduling is described elsewhere.', ...page.slice(1)]
    expect(positionIn(edited, anchorIn(page, 'Scheduling'))).toStrictEqual({ kind: 'detached' })
  })

  it('returns detached when the block that started with the quote is deleted', () => {
    expect(positionIn(page.slice(0, 3), anchorIn(page, 'Mondays', 1))).toStrictEqual({
      kind: 'detached',
    })
  })
})

describe('currentPosition of a short quote', () => {
  const page = ['The export job retries 5 times a night.']
  const anchor = anchorIn(page, '5 times')

  it('returns detached when only a copy with another context is left', () => {
    expect(positionIn(['The import job runs 5 times on Monday.'], anchor)).toStrictEqual({
      kind: 'detached',
    })
  })

  it('returns a fuzzy match when the context is still there', () => {
    expect(positionIn(['The export job retries 6 times a night.'], anchor)).toMatchObject({
      text: '6 times',
      match: 'fuzzy',
    })
  })
})

describe('currentPosition of a short quote that is still on the page once', () => {
  const page = [
    'The export job writes the paid invoices of each shop to a CSV file every night. It retries 5 times.',
  ]

  it('returns the exact copy when the agent adds a sentence after the quote', () => {
    const edited = [
      'The export job writes the paid invoices of each shop to a CSV file every night. Every shop exports at 02:00. It retries 5 times.',
    ]
    expect(positionIn(edited, anchorIn(page, 'every night'))).toMatchObject({
      kind: 'attached',
      text: 'every night',
      match: 'exact',
    })
  })

  it('returns the exact copy when the agent rewrites the text before the quote', () => {
    const anchor = anchorIn(page, 'to a CSV file')
    const edited = [
      'At 02:00 the job sends the invoices to a CSV file every night. It retries 5 times.',
    ]
    expect(positionIn(edited, anchor)).toMatchObject({ text: 'to a CSV file', match: 'exact' })
  })

  it('returns detached when the quote was on the page twice when Nick commented', () => {
    const twoCopies = ['The export job writes a file. The import job reads a file every day.']
    const anchor = anchorIn(twoCopies, 'a file')
    const edited = ['The export job writes a file at 02:00 for each shop of the region.']
    expect(positionIn(edited, anchor)).toStrictEqual({ kind: 'detached' })
  })
})

describe('currentPosition of a fuzzy match', () => {
  it('returns the whole new word when a word at the end of a heading gets longer', () => {
    const anchor = anchorIn(['## Retry policy'], 'Retry policy')
    expect(positionIn(['## Retry policies'], anchor)).toMatchObject({ text: 'Retry policies' })
  })

  it('returns the new number when the number at the end of a code line changes', () => {
    const code = ['```ts', 'const retries = 5', 'const wait = 30', '```']
    const edited = code.map((line) => line.replace('= 5', '= 8'))
    expect(positionIn(edited, anchorIn(code, 'const retries = 5'))).toMatchObject({
      text: 'const retries = 8',
    })
  })

  it('keeps the new emoji whole when the emoji at the end of the quote changes', () => {
    const anchor = anchorIn(['The party in Zürich 🎉 starts at 8.'], 'party in Zürich 🎉')
    expect(positionIn(['The party in Zürich 🎊 starts at 8.'], anchor)).toMatchObject({
      text: 'party in Zürich 🎊',
    })
  })
})

describe('currentPosition of a thread of version 1 without any context', () => {
  const oldAnchor = {
    firstLine: 3,
    lastLine: 3,
    selectedText: 'Mondays',
    prefix: undefined,
    suffix: undefined,
  }

  it('returns the only copy when the quote is near the old lines', () => {
    const page = ['# Old pad', '', '', '', 'Mondays are when the report is sent.']
    expect(positionIn(page, oldAnchor)).toMatchObject({ firstLine: 5, match: 'exact', score: 1 })
  })

  it('returns detached when the only copy is far from the old lines', () => {
    const page = ['# Old pad', '', '', '', '', '', '', 'Mondays are when the report is sent.']
    expect(positionIn(page, oldAnchor)).toStrictEqual({ kind: 'detached' })
  })

  it('returns detached when the quote is on the page twice', () => {
    const page = ['# Old pad', '', 'Mondays are busy.', '', 'Mondays are slow.']
    expect(positionIn(page, oldAnchor)).toStrictEqual({ kind: 'detached' })
  })

  it('returns the only similar text when the quote is changed near the old lines', () => {
    const page = ['# Old pad', '', 'Monday is when the report is sent.']
    expect(positionIn(page, { ...oldAnchor, selectedText: 'Mondays are when' })).toMatchObject({
      text: 'Monday is when',
      match: 'fuzzy',
    })
  })

  it('returns detached when the quote is lost', () => {
    expect(positionIn(['The export job stops.'], oldAnchor)).toStrictEqual({ kind: 'detached' })
  })
})

describe('copiesOnPage', () => {
  it('counts every copy of the selected text in every block of the page', () => {
    expect(copiesOnPage('retries  5', 'It retries 5 times.\n\nIt retries 5 times again.')).toBe(2)
  })
})

describe('positionedThread', () => {
  it('adds the current position when the thread has an anchor', () => {
    const thread = aThread({ anchor: anchorIn(exportPage, retrySentence) })
    expect(positionedThread(thread, exportPage.join('\n')).position).toMatchObject({
      kind: 'attached',
      firstLine: 5,
    })
  })

  it('adds an undefined position when an improvement note has no anchor', () => {
    const thread = aThread({ id: 'i-1', type: 'improvement', anchor: undefined })
    expect(positionedThread(thread, exportPage.join('\n')).position).toBeUndefined()
  })
})

describe('currentPosition on a big page', () => {
  const words = [
    ...'the a of to and in is it that for on with as by at from or which this then'.split(' '),
    ...'shop invoice export job retry network file night finance report paid slow'.split(' '),
    ...'template tax number every each when after before writes reads sends runs'.split(' '),
    ...'fails waits Berlin Paris bakery florist total line page agent comment'.split(' '),
  ]
  const wordAt = (paragraph: number, at: number): string => {
    const mixed = Math.imul(paragraph * 31 + at + 1, 2654435761) >>> 0
    return String(words[(Math.imul(mixed ^ (mixed >>> 15), 2246822519) >>> 0) % words.length])
  }
  const paragraphs = Array.from({ length: 1000 }, (_, paragraph) =>
    Array.from({ length: 24 }, (_, at) => wordAt(paragraph, at)).join(' '),
  )
  const page = paragraphs.flatMap((paragraph) => [`${paragraph}.`, ''])
  const anchors = Array.from({ length: 100 }, (_, thread) =>
    anchorIn(
      page,
      String(paragraphs[thread * 10])
        .slice(30, 90)
        .trim(),
    ),
  )

  it('returns the positions of 100 rewritten quotes on a page of 2,000 lines within 1.5 seconds', () => {
    const rewritten = page.map((line, at) =>
      at % 20 === 0 ? `Rewritten paragraph ${at} about the weather in spring.` : line,
    )
    const started = performance.now()
    const positions = anchors.map((anchor) => positionIn(rewritten, anchor))
    const took = performance.now() - started
    expect(positions.filter((position) => position.kind === 'detached')).toHaveLength(100)
    expect(took).toBeLessThan(1500)
  })
})

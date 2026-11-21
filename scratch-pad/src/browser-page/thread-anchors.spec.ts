import { describe, expect, it } from 'vitest'
import { type Thread } from './api-responses'
import { retryQuestion, toneNote } from './browser-page-fixtures'
import { parsedPageBody } from './page-elements'
import { placeThreads } from './thread-anchors'

const body = parsedPageBody(
  [
    '<h1 data-lines="1-1">Invoice export</h1>',
    '<p data-lines="3-4">The export job writes the paid invoices. The invoice template shows the tax number.</p>',
    '<!-- a comment of the page -->',
    '<p>A paragraph without lines.</p>',
    '<p data-lines="8-8">The job retries 5 times.</p>',
    '<p data-lines="10-10">The job retries 8 times now.</p>',
  ].join(''),
)

const improvement: Thread = {
  ...toneNote,
  id: 'i-1',
  type: 'improvement',
  anchor: undefined,
  position: undefined,
}

function retryFoundOn(line: number): Thread {
  return {
    ...retryQuestion,
    position: {
      kind: 'attached',
      firstLine: line,
      lastLine: line,
      text: 'retries 8 times',
      occurrence: 0,
      match: 'fuzzy',
      score: 0.98,
    },
  }
}

describe('placeThreads', () => {
  it('attaches each thread to the block of its position and orders them like the blocks', () => {
    const placed = placeThreads(body, [retryQuestion, toneNote])
    expect(placed.map((each) => [each.thread.id, each.blockLines, each.textChanged])).toStrictEqual(
      [
        ['g-1', '3-4', false],
        ['c-1', '8-8', false],
      ],
    )
  })

  it('highlights the text that is there now when the server found the text on other lines', () => {
    const [placed] = placeThreads(body, [retryFoundOn(10)])
    expect(placed?.highlight).toStrictEqual({
      blockLines: '10-10',
      selectedText: 'retries 8 times',
      occurrence: 0,
    })
  })

  it('marks the text as changed and places the card beside the block before the old lines when the thread is detached', () => {
    const detached: Thread = { ...retryQuestion, position: { kind: 'detached' } }
    const [placed] = placeThreads(body, [detached])
    expect([placed?.blockLines, placed?.textChanged, placed?.highlight]).toStrictEqual([
      '8-8',
      true,
      undefined,
    ])
  })

  it('places the card without a highlight beside the block before the lines when the page doesn’t have the block yet', () => {
    const [placed] = placeThreads(body, [retryFoundOn(9)])
    expect([placed?.blockLines, placed?.textChanged, placed?.highlight]).toStrictEqual([
      '8-8',
      false,
      undefined,
    ])
  })

  it('places the card beside the first block when the old lines are before every block', () => {
    const early: Thread = {
      ...retryQuestion,
      anchor: { firstLine: 0, lastLine: 0, selectedText: 'x', prefix: '', suffix: '' },
      position: { kind: 'detached' },
    }
    expect(placeThreads(body, [early])[0]?.blockLines).toBe('1-1')
  })

  it('puts a note without an anchor first and a detached thread on an empty page at the top', () => {
    const detached: Thread = { ...retryQuestion, position: { kind: 'detached' } }
    const placed = placeThreads(parsedPageBody('<p>Empty</p>'), [detached, improvement])
    expect(placed.map((each) => [each.thread.id, each.blockLines, each.order])).toStrictEqual([
      ['c-1', undefined, -1],
      ['i-1', undefined, -1],
    ])
  })
})

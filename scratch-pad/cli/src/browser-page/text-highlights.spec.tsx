import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { parsedPageBody } from './page-elements'
import {
  highlightedTexts,
  occurrenceAfter,
  selectedTextIn,
  type TextHighlight,
} from './text-highlights'

const html = [
  '<p data-lines="3-4">The export job <strong>retries 5</strong> times.\nEach retry waits 30 seconds.</p>',
  '<p data-lines="6-6">The job writes one file per shop.<script>retries</script></p>',
].join('')

function highlight(overrides: Partial<TextHighlight>): TextHighlight {
  return {
    thread: 'c-1',
    kind: 'comment',
    active: false,
    blockLines: '3-4',
    selectedText: 'retries 5 times',
    occurrence: 0,
    ...overrides,
  }
}

function shownBlock(highlights: readonly TextHighlight[]): HTMLElement {
  const body = parsedPageBody(html)
  const texts = highlightedTexts(body, highlights)
  const { container } = render(
    <p>
      {[...(body.firstElementChild?.childNodes ?? [])].map((node) =>
        node instanceof Element ? (
          <strong key="strong">{texts.get(node.firstChild ?? node) ?? node.textContent}</strong>
        ) : (
          <span key="text">{texts.get(node) ?? node.textContent}</span>
        ),
      )}
    </p>,
  )
  return container
}

describe('selectedTextIn', () => {
  it('finds the second copy of the text when the occurrence is 1', () => {
    const block = parsedPageBody('<p>the job stops and the job starts</p>').firstElementChild
    const [span] = selectedTextIn(block ?? document.body, 'the job', 1) ?? []
    expect([span?.start, span?.end]).toStrictEqual([18, 25])
  })

  it('returns nothing when the block has fewer copies than the occurrence', () => {
    const block = parsedPageBody('<p>The job stops.</p>').firstElementChild
    expect(selectedTextIn(block ?? document.body, 'job', 1)).toBeUndefined()
  })

  it('finds the selected text across the inline elements when the whitespace differs', () => {
    const block = parsedPageBody(html).firstElementChild ?? document.body
    const spans = selectedTextIn(block, 'retries 5   times. Each')
    expect(spans?.map((span) => span.node.data.slice(span.start, span.end))).toStrictEqual([
      'retries 5',
      ' times.\nEach',
    ])
  })

  it('finds the whole emoji when the selected text ends with an emoji after an accent', () => {
    const block = parsedPageBody('<p>The party in Zürich 🎊 starts.</p>').firstElementChild
    const [span] = selectedTextIn(block ?? document.body, 'party in Zürich 🎊') ?? []
    expect(span?.node.data.slice(span.start, span.end)).toBe('party in Zürich 🎊')
  })

  it('doesn’t find text that is only inside a script of the block', () => {
    const block = parsedPageBody(html).lastElementChild ?? document.body
    expect(selectedTextIn(block, 'shop.retries')).toBeUndefined()
  })

  it('doesn’t find anything when the selected text is empty', () => {
    expect(selectedTextIn(parsedPageBody(html), '  ')).toBeUndefined()
  })
})

describe('occurrenceAfter', () => {
  it('counts the copies of the selected text before the selection when the text is repeated', () => {
    expect(occurrenceAfter('The job retries the shop. Then the ', 'job retries the shop')).toBe(1)
  })

  it('returns 0 when the selected text is the first copy in the block', () => {
    expect(occurrenceAfter('The ', 'job retries the shop')).toBe(0)
  })

  it('counts a copy that overlaps the start of the selection as an earlier copy', () => {
    expect(occurrenceAfter('a', 'aa')).toBe(1)
  })

  it('returns 0 when the selected text is only whitespace', () => {
    expect(occurrenceAfter('The job ', '  ')).toBe(0)
  })
})

describe('highlightedTexts', () => {
  it('splits the text nodes into plain text and highlights when a thread has selected the text', () => {
    const marks = shownBlock([highlight({})]).querySelectorAll('mark')
    expect([...marks].map((mark) => mark.textContent)).toStrictEqual(['retries 5', ' times'])
    expect(marks[0]?.getAttribute('data-highlight')).toBe('c-1')
  })

  it('shows the kind of the active thread where 2 threads have selected the same text', () => {
    const marks = shownBlock([
      highlight({}),
      highlight({ thread: 'g-1', kind: 'grammar', active: true, selectedText: 'times' }),
    ]).querySelectorAll('mark')
    expect(
      [...marks].map((mark) => [mark.textContent, mark.getAttribute('data-highlight')]),
    ).toStrictEqual([
      ['retries 5', 'c-1'],
      [' ', 'c-1'],
      ['times', 'c-1 g-1'],
    ])
    expect(marks[2]?.getAttribute('data-kind')).toBe('grammar')
  })

  it('leaves the text alone when the block of the thread doesn’t exist any more', () => {
    expect(shownBlock([highlight({ blockLines: '9-9' })]).querySelector('mark')).toBeNull()
  })
})

describe('highlightedTexts for a search match', () => {
  const page = [
    '<p data-lines="1-1">The export job retries (5) times.</p>',
    '<h2 id="retry-limit" data-lines="3-3">Retry limit</h2>',
    '<p data-lines="5-5">Each <strong>re</strong>try waits. The RETRY limit is 5.</p>',
    '<div class="decision" data-lines="7-9"><p>Raise the retry limit.</p></div>',
    '<h2 id="wait" data-lines="11-11">Wait</h2>',
    '<p data-lines="13-13">The retry waits 30 seconds.</p>',
  ].join('')

  function searchMarksOf(
    headingId: string | undefined,
    query: string,
    highlights: readonly TextHighlight[] = [],
  ): (string | undefined)[][] {
    const body = parsedPageBody(page)
    const texts = highlightedTexts(body, highlights, { headingId, query })
    const { container } = render(
      <div>
        {[...body.querySelectorAll('h2, p, strong')].flatMap((element) =>
          [...element.childNodes].map((node) => (
            <span key={`${element.textContent}-${String(node.textContent)}`}>
              {texts.get(node) ?? null}
            </span>
          )),
        )}
      </div>,
    )
    return [...container.querySelectorAll('mark')].map((mark) => [
      mark.textContent ?? undefined,
      mark.getAttribute('data-kind') ?? undefined,
      mark.getAttribute('data-highlight') ?? undefined,
    ])
  }

  it('highlights every copy of the query from the heading to the next heading but not in a decision', () => {
    expect(searchMarksOf('retry-limit', 'retry')).toStrictEqual([
      ['Retry', 'search', ''],
      ['try', 'search', ''],
      ['RETRY', 'search', ''],
      ['re', 'search', ''],
    ])
  })

  it('highlights the copies before the first heading when the match doesn’t have a heading id', () => {
    expect(searchMarksOf(undefined, '(5)')).toStrictEqual([['(5)', 'search', '']])
  })

  it('doesn’t highlight anything when the heading isn’t on the page any more or the query is only whitespace', () => {
    expect([searchMarksOf('gone', 'retry'), searchMarksOf('wait', '  ')]).toStrictEqual([[], []])
  })

  it('shows the search match over the highlight of a thread and keeps the id of the thread', () => {
    const thread = highlight({ blockLines: '13-13', selectedText: 'retry waits', active: true })
    expect(searchMarksOf('wait', 'retry', [thread])).toStrictEqual([
      ['retry', 'search', 'c-1'],
      [' waits', 'comment', 'c-1'],
    ])
  })
})

import { describe, expect, it } from 'vitest'
import { aThread } from './thread-fixtures'
import { threadInboxLines, threadShowLines } from './thread-text'

const indexPage = [
  '# Export job',
  '',
  '## Retry policy',
  '',
  'The export job retries 5 times.',
  'Each retry waits 30 seconds.',
]

const longPage = [
  '# Invoice template',
  ...Array.from({ length: 12 }, (_, index) => `Line ${index + 2}`),
]

describe('threadInboxLines', () => {
  it('prints the id, the lines, the section, the selected text, the message and the block', () => {
    expect(threadInboxLines(aThread({}), indexPage)).toStrictEqual([
      '[c-1] comment · pages/index.md:5-6 · section "Retry policy"',
      '  selected: "The export job retries 5 times."',
      '  Nick: Is 5 retries enough on a slow network?',
      '  block:',
      '    5 | The export job retries 5 times.',
      '    6 | Each retry waits 30 seconds.',
    ])
  })

  it('prints one line number when the anchor is one line', () => {
    const thread = aThread({ anchor: { firstLine: 5, lastLine: 5, selectedText: 'retries' } })

    expect(threadInboxLines(thread, indexPage)[0]).toBe(
      '[c-1] comment · pages/index.md:5 · section "Retry policy"',
    )
  })

  it('leaves out the section when there is no heading above the anchor', () => {
    const thread = aThread({ anchor: { firstLine: 1, lastLine: 1, selectedText: 'retries' } })

    expect(threadInboxLines(thread, ['plain text'])[0]).toBe('[c-1] comment · pages/index.md:1')
  })

  it('prints only the page when an improvement note has no anchor', () => {
    const thread = aThread({ id: 'i-1', type: 'improvement', anchor: undefined })

    expect(threadInboxLines(thread, indexPage)).toStrictEqual([
      '[i-1] improvement note · pages/index.md',
      '  Nick: Is 5 retries enough on a slow network?',
    ])
  })

  it('prints the first 5 lines and a pointer to show when the block is longer than 8 lines', () => {
    const thread = aThread({ anchor: { firstLine: 2, lastLine: 13, selectedText: 'Line 2' } })

    expect(threadInboxLines(thread, longPage).slice(-6)).toStrictEqual([
      '     2 | Line 2',
      '     3 | Line 3',
      '     4 | Line 4',
      '     5 | Line 5',
      '     6 | Line 6',
      '    … 7 more lines (scratch-pad show c-1)',
    ])
  })

  it('prints a note instead of the block when the lines are no longer in the page', () => {
    const thread = aThread({ anchor: { firstLine: 40, lastLine: 42, selectedText: 'retries' } })

    expect(threadInboxLines(thread, indexPage).at(-1)).toBe(
      "  block: (lines 40-42 aren't in pages/index.md any more)",
    )
  })

  it('shortens the selected text to 160 characters and joins its lines', () => {
    const selectedText = `${'retry '.repeat(20)}\n${'wait '.repeat(20)}`
    const thread = aThread({ anchor: { firstLine: 5, lastLine: 5, selectedText } })

    const selectedLine = threadInboxLines(thread, indexPage)[1]
    const joined = 'retry '.repeat(20) + 'wait '.repeat(20)

    expect(selectedLine).toBe(`  selected: "${joined.slice(0, 159)}…"`)
  })

  it('prints only the messages since the last reply of the agent with a count of the earlier ones', () => {
    const thread = aThread({
      messages: [
        { author: 'nick', text: 'Is 5 enough?', time: '2026-03-14T09:30:00.000Z' },
        { author: 'agent', text: 'Yes.', time: '2026-03-14T09:40:00.000Z' },
        { author: 'nick', text: 'What about\na slow network?', time: '2026-03-14T09:50:00.000Z' },
      ],
    })

    expect(threadInboxLines(thread, indexPage).slice(2, 4)).toStrictEqual([
      '  earlier: 2 messages (scratch-pad show c-1)',
      '  Nick: What about\n    a slow network?',
    ])
  })
})

describe('threadShowLines', () => {
  it('prints the state, the whole block and every message with its time', () => {
    const thread = aThread({
      waitsFor: 'nick',
      messages: [
        { author: 'nick', text: 'Is 5 enough?', time: '2026-03-14T09:30:00.000Z' },
        { author: 'agent', text: 'I raised it to 8.', time: '2026-03-14T09:40:00.000Z' },
      ],
    })

    expect(threadShowLines(thread, indexPage)).toStrictEqual([
      '[c-1] comment · pages/index.md:5-6 · section "Retry policy" · waits for Nick',
      '  selected: "The export job retries 5 times."',
      '  block:',
      '    5 | The export job retries 5 times.',
      '    6 | Each retry waits 30 seconds.',
      '  Nick (2026-03-14 09:30): Is 5 enough?',
      '  agent (2026-03-14 09:40): I raised it to 8.',
    ])
  })

  it('prints every line of a long block', () => {
    const thread = aThread({ anchor: { firstLine: 2, lastLine: 13, selectedText: 'Line 2' } })

    expect(threadShowLines(thread, longPage)).toStrictEqual([
      '[c-1] comment · pages/index.md:2-13 · section "Invoice template" · waits for the agent',
      '  selected: "Line 2"',
      '  block:',
      ...Array.from({ length: 12 }, (_, index) => {
        const line = String(index + 2)
        return `    ${line.padStart(2)} | Line ${line}`
      }),
      '  Nick (2026-03-14 09:30): Is 5 retries enough on a slow network?',
    ])
  })

  it('prints the outcome and closed when a note is done', () => {
    const thread = aThread({
      id: 'g-1',
      type: 'grammar',
      waitsFor: 'nobody',
      outcome: 'Removed the comma.',
    })

    const lines = threadShowLines(thread, indexPage)

    expect([lines[0], lines.at(-1)]).toStrictEqual([
      '[g-1] grammar note · pages/index.md:5-6 · section "Retry policy" · closed',
      '  outcome: Removed the comma.',
    ])
  })

  it('prints waits for the agent when the thread waits for the agent', () => {
    expect(threadShowLines(aThread({}), indexPage)[0]).toBe(
      '[c-1] comment · pages/index.md:5-6 · section "Retry policy" · waits for the agent',
    )
  })
})

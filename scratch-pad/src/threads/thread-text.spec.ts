import { describe, expect, it } from 'vitest'
import { exportJobAddress, servedLinks, unservedLinks } from '../item-links/item-links-fixtures'
import { aThread, retryAnchor } from './thread-fixtures'
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
    expect(threadInboxLines(aThread({}), indexPage, unservedLinks)).toStrictEqual([
      '[c-1] comment · pages/index.md:5-6 · section "Retry policy"',
      '  selected: "The export job retries 5 times."',
      '  Nick: Is 5 retries enough on a slow network?',
      '  block:',
      '    5 | The export job retries 5 times.',
      '    6 | Each retry waits 30 seconds.',
    ])
  })

  it('prints one line number when the block is one line', () => {
    const thread = aThread({
      anchor: {
        firstLine: 5,
        lastLine: 5,
        selectedText: 'retries',
        prefix: 'The export job',
        suffix: '5 times.',
      },
    })

    expect(threadInboxLines(thread, indexPage.slice(0, 5), unservedLinks)[0]).toBe(
      '[c-1] comment · pages/index.md:5 · section "Retry policy"',
    )
  })

  it('leaves out the section when there is no heading above the block', () => {
    const thread = aThread({
      anchor: { firstLine: 1, lastLine: 1, selectedText: 'retries', prefix: 'plain', suffix: '' },
    })

    expect(threadInboxLines(thread, ['plain retries'], unservedLinks)[0]).toBe(
      '[c-1] comment · pages/index.md:1',
    )
  })

  it('prints the current lines and block when the agent added lines above the text', () => {
    const page = [...indexPage.slice(0, 4), 'A new paragraph.', '', ...indexPage.slice(4)]

    expect(threadInboxLines(aThread({}), page, unservedLinks)).toStrictEqual([
      '[c-1] comment · pages/index.md:7-8 · section "Retry policy"',
      '  selected: "The export job retries 5 times."',
      '  Nick: Is 5 retries enough on a slow network?',
      '  block:',
      '    7 | The export job retries 5 times.',
      '    8 | Each retry waits 30 seconds.',
    ])
  })

  it('prints the text that is there now when the agent changed a word of the selected text', () => {
    const page = indexPage.map((line) => line.replace('5 times', '8 times'))

    expect(threadInboxLines(aThread({}), page, unservedLinks).slice(1, 3)).toStrictEqual([
      '  selected: "The export job retries 5 times."',
      '  now: "The export job retries 8 times."',
    ])
  })

  it('prints only the page when an improvement note has no anchor', () => {
    const thread = aThread({ id: 'i-1', type: 'improvement', anchor: undefined })

    expect(threadInboxLines(thread, indexPage, unservedLinks)).toStrictEqual([
      '[i-1] improvement note · pages/index.md',
      '  Nick: Is 5 retries enough on a slow network?',
    ])
  })

  it('prints the first 5 lines and a pointer to show when the block is longer than 8 lines', () => {
    const thread = aThread({
      anchor: {
        firstLine: 2,
        lastLine: 13,
        selectedText: 'Line 2',
        prefix: '',
        suffix: 'Line 3 Line 4 Line 5 Line 6 Line',
      },
    })

    expect(threadInboxLines(thread, longPage, unservedLinks).slice(-6)).toStrictEqual([
      '     2 | Line 2',
      '     3 | Line 3',
      '     4 | Line 4',
      '     5 | Line 5',
      '     6 | Line 6',
      '    … 7 more lines (scratch-pad show --pad 2026-03-14-export-job c-1)',
    ])
  })

  it('prints that the thread is detached with the old lines when the selected text was deleted', () => {
    const page = indexPage.map((line) => line.replace('The export job retries 5 times.', ''))

    expect(threadInboxLines(aThread({}), page, unservedLinks)).toStrictEqual([
      '[c-1] comment · pages/index.md · detached from lines 5-6',
      '  selected: "The export job retries 5 times."',
      '  Nick: Is 5 retries enough on a slow network?',
      "  block: (the selected text isn't in pages/index.md any more)",
    ])
  })

  it('prints that the page doesn’t exist any more when the agent deleted the page of the thread', () => {
    expect(threadInboxLines(aThread({}), [], unservedLinks).at(-1)).toBe(
      "  block: (pages/index.md doesn't exist any more)",
    )
  })

  it('prints the one old line when a thread of one line is detached', () => {
    const thread = aThread({ anchor: { ...retryAnchor, lastLine: 5 } })

    expect(threadInboxLines(thread, ['# Export job'], unservedLinks)[0]).toBe(
      '[c-1] comment · pages/index.md · detached from line 5',
    )
  })

  it('shortens the selected text to 160 characters and joins its lines', () => {
    const selectedText = `${'retry '.repeat(20)}\n${'wait '.repeat(20)}`
    const thread = aThread({
      anchor: { firstLine: 5, lastLine: 5, selectedText, prefix: '', suffix: '' },
    })

    const selectedLine = threadInboxLines(thread, [selectedText], unservedLinks)[1]
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

    expect(threadInboxLines(thread, indexPage, unservedLinks).slice(2, 4)).toStrictEqual([
      '  earlier: 2 messages (scratch-pad show --pad 2026-03-14-export-job c-1)',
      '  Nick: What about\n    a slow network?',
    ])
  })
})

describe('the link of a thread', () => {
  it('prints the link under the header in the inbox when the server is running', () => {
    expect(threadInboxLines(aThread({}), indexPage, servedLinks).slice(0, 2)).toStrictEqual([
      '[c-1] comment · pages/index.md:5-6 · section "Retry policy"',
      `  link: ${exportJobAddress}#c-1`,
    ])
  })

  it('prints the link under the header of the whole thread when the server is running', () => {
    expect(threadShowLines(aThread({}), indexPage, servedLinks)[1]).toBe(
      `  link: ${exportJobAddress}#c-1`,
    )
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

    expect(threadShowLines(thread, indexPage, unservedLinks)).toStrictEqual([
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
    const thread = aThread({
      anchor: {
        firstLine: 2,
        lastLine: 13,
        selectedText: 'Line 2',
        prefix: '',
        suffix: 'Line 3 Line 4 Line 5 Line 6 Line',
      },
    })

    expect(threadShowLines(thread, longPage, unservedLinks)).toStrictEqual([
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

    const lines = threadShowLines(thread, indexPage, unservedLinks)

    expect([lines[0], lines.at(-1)]).toStrictEqual([
      '[g-1] grammar note · pages/index.md:5-6 · section "Retry policy" · closed',
      '  outcome: Removed the comma.',
    ])
  })

  it('prints waits for the agent when the thread waits for the agent', () => {
    expect(threadShowLines(aThread({}), indexPage, unservedLinks)[0]).toBe(
      '[c-1] comment · pages/index.md:5-6 · section "Retry policy" · waits for the agent',
    )
  })
})

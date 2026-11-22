import { describe, expect, it } from 'vitest'
import { type Thread } from './api-responses'
import {
  exportPad,
  exportPadAddresses,
  indexInbox,
  pageSummaries,
  retryQuestion,
} from './browser-page-fixtures'
import { nickInboxEntries } from './nick-inbox-entries'

const noReadMarks = { pages: [] }

describe('nickInboxEntries', () => {
  it('lists the open decisions first and then the replies with the page, the quote and the last message', () => {
    expect(
      nickInboxEntries(exportPadAddresses, indexInbox, pageSummaries, noReadMarks),
    ).toStrictEqual([
      {
        key: 'd-1',
        href: `/${exportPad}/#d-1`,
        kind: 'decision',
        where: 'Invoice export',
        quote: 'Will the export job retry 8 times?',
        last: undefined,
        time: undefined,
        shownTime: undefined,
      },
      {
        key: 'c-1',
        href: `/${exportPad}/#c-1`,
        kind: 'reply',
        where: 'Invoice export',
        quote: 'retries 5 times',
        last: 'Agent: I have raised the limit to 8.',
        time: '2026-11-20T21:12:00.000Z',
        shownTime: '20 Nov, 21:12',
      },
    ])
  })

  it('quotes the first message and names the file when the thread has no anchor and the page no title', () => {
    const note = {
      ...retryQuestion,
      page: 'pages/retry-limit.md',
      anchor: undefined,
      position: undefined,
      messages: retryQuestion.messages.slice(0, 1),
    }
    const [entry] = nickInboxEntries(
      exportPadAddresses,
      { threads: [note], decisions: [] },
      pageSummaries,
      noReadMarks,
    )
    expect([entry?.where, entry?.quote, entry?.last]).toStrictEqual([
      'retry-limit.md',
      'Is 5 retries enough?',
      'Nick: Is 5 retries enough?',
    ])
  })

  it('quotes the text that is there now when the agent changed the selected text', () => {
    const changed: Thread = {
      ...retryQuestion,
      position: {
        kind: 'attached',
        firstLine: 9,
        lastLine: 9,
        text: 'retries 8 times',
        occurrence: 0,
        match: 'fuzzy',
        score: 0.98,
      },
    }
    const [entry] = nickInboxEntries(
      exportPadAddresses,
      { threads: [changed], decisions: [] },
      [],
      noReadMarks,
    )
    expect(entry?.quote).toBe('retries 8 times')
  })

  it('quotes the text that Nick selected when the thread is detached', () => {
    const detached: Thread = { ...retryQuestion, position: { kind: 'detached' } }
    const [entry] = nickInboxEntries(
      exportPadAddresses,
      { threads: [detached], decisions: [] },
      [],
      noReadMarks,
    )
    expect(entry?.quote).toBe('retries 5 times')
  })

  it('leaves out a thread without any messages', () => {
    const empty = { ...retryQuestion, messages: [] }
    expect(
      nickInboxEntries(exportPadAddresses, { threads: [empty], decisions: [] }, [], noReadMarks),
    ).toStrictEqual([])
  })

  it('lists the new pages and then the changed sections with their places, the newest first, before the decisions', () => {
    const entries = nickInboxEntries(
      exportPadAddresses,
      { threads: [], decisions: [] },
      pageSummaries,
      {
        pages: [
          {
            page: 'pages/invoice-template.md',
            state: 'read',
            changedTime: '2026-11-20T21:30:00.000Z',
            sections: [{ id: 'the-logo', hash: 'b2' }],
            changedSections: [{ id: 'the-logo', title: 'The logo', hash: 'b2' }],
          },
          {
            page: 'pages/first-retry.md',
            state: 'new',
            changedTime: '2026-11-20T21:10:00.000Z',
            sections: [],
            changedSections: [],
          },
          {
            page: 'pages/wait-between-retries.md',
            state: 'new',
            changedTime: '2026-11-20T21:20:00.000Z',
            sections: [],
            changedSections: [],
          },
          {
            page: 'pages/index.md',
            state: 'read',
            changedTime: '2026-11-20T21:00:00.000Z',
            sections: [],
            changedSections: [],
          },
        ],
      },
    )
    expect(
      entries.map((entry) => [entry.kind, entry.where, entry.quote, entry.shownTime]),
    ).toStrictEqual([
      [
        'page',
        'retry-limit.md › 2.1 Wait between retries',
        'Each retry waits twice as long as the retry before it.',
        '20 Nov, 21:20',
      ],
      [
        'page',
        'retry-limit.md › 2.1.1 First retry',
        'The first retry waits 30 seconds.',
        '20 Nov, 21:10',
      ],
      ['section', 'Invoice template › The logo', undefined, 'Changed 20 Nov, 21:30'],
    ])
    expect(entries.map((entry) => entry.href)).toStrictEqual([
      `/${exportPad}/wait-between-retries.md`,
      `/${exportPad}/first-retry.md`,
      `/${exportPad}/invoice-template.md#the-logo`,
    ])
  })
})

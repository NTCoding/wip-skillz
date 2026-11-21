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

describe('nickInboxEntries', () => {
  it('lists the open decisions first and then the replies with the page, the quote and the last message', () => {
    expect(nickInboxEntries(exportPadAddresses, indexInbox, pageSummaries)).toStrictEqual([
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
    const [entry] = nickInboxEntries(exportPadAddresses, { threads: [changed], decisions: [] }, [])
    expect(entry?.quote).toBe('retries 8 times')
  })

  it('quotes the text that Nick selected when the thread is detached', () => {
    const detached: Thread = { ...retryQuestion, position: { kind: 'detached' } }
    const [entry] = nickInboxEntries(exportPadAddresses, { threads: [detached], decisions: [] }, [])
    expect(entry?.quote).toBe('retries 5 times')
  })

  it('leaves out a thread without any messages', () => {
    const empty = { ...retryQuestion, messages: [] }
    expect(
      nickInboxEntries(exportPadAddresses, { threads: [empty], decisions: [] }, []),
    ).toStrictEqual([])
  })
})

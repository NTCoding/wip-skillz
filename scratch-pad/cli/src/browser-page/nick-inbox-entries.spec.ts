import { describe, expect, it } from 'vitest'
import { type ProgressTracker, type Thread } from './api-responses'
import {
  exportPad,
  exportPadAddresses,
  indexInbox,
  pageSummaries,
  progressTracker,
  retryQuestion,
} from './browser-page-fixtures'
import { nickInboxEntries } from './nick-inbox-entries'

const noReadMarks = { pages: [] }

describe('nickInboxEntries', () => {
  it('lists the replies and the open decisions with the newest first, with the page, the quote, the last message and the context', () => {
    expect(
      nickInboxEntries(exportPadAddresses, indexInbox, pageSummaries, noReadMarks, undefined),
    ).toStrictEqual([
      {
        key: 'c-1',
        href: `/${exportPad}/#c-1`,
        kind: 'reply',
        heading: 'The agent replied',
        where: 'Invoice export',
        quote: 'retries 5 times',
        last: 'Agent: I have raised the limit to 8.',
        time: '2026-11-20T21:12:00.000Z',
        shownTime: '20 Nov, 21:12',
        context: undefined,
      },
      {
        key: 'd-1',
        href: `/${exportPad}/#d-1`,
        kind: 'decision',
        heading: 'A decision to make',
        where: 'Invoice export',
        quote: 'Will the export job retry 8 times?',
        last: undefined,
        time: '2026-11-20T21:05:00.000Z',
        shownTime: '20 Nov, 21:05',
        context: {
          lead: 'A slow network in the evening can make an upload fail. Read these in order:',
          links: [
            { text: 'The invoice template', href: `/${exportPad}/invoice-template.md` },
            { text: 'The retry limit', href: `/${exportPad}/retry-limit.md#what-counts` },
          ],
        },
      },
    ])
  })

  it('sorts the replies and the decisions together by their time with the newest first', () => {
    const olderReply: Thread = {
      ...retryQuestion,
      id: 'c-2',
      messages: [{ author: 'agent', text: 'Done.', time: '2026-11-20T21:01:00.000Z' }],
    }
    const newerReply: Thread = {
      ...retryQuestion,
      id: 'c-3',
      messages: [{ author: 'agent', text: 'Done.', time: '2026-11-20T21:30:00.000Z' }],
    }
    const entries = nickInboxEntries(
      exportPadAddresses,
      {
        threads: [olderReply, retryQuestion, newerReply],
        decisions: [
          {
            page: 'pages/index.md',
            id: 'd-2',
            line: 30,
            question: 'Will the job log each retry?',
            time: '2026-11-20T21:40:00.000Z',
            context: undefined,
          },
          ...indexInbox.decisions,
        ],
      },
      pageSummaries,
      noReadMarks,
      undefined,
    )
    expect(entries.map((entry) => [entry.key, entry.shownTime])).toStrictEqual([
      ['d-2', '20 Nov, 21:40'],
      ['c-3', '20 Nov, 21:30'],
      ['c-1', '20 Nov, 21:12'],
      ['d-1', '20 Nov, 21:05'],
      ['c-2', '20 Nov, 21:01'],
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
      undefined,
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
      undefined,
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
      undefined,
    )
    expect(entry?.quote).toBe('retries 5 times')
  })

  it('leaves out a thread without any messages', () => {
    const empty = { ...retryQuestion, messages: [] }
    expect(
      nickInboxEntries(
        exportPadAddresses,
        { threads: [empty], decisions: [] },
        [],
        noReadMarks,
        undefined,
      ),
    ).toStrictEqual([])
  })

  it('lists each new page and each page with changed sections, the newest first, after the decisions', () => {
    const entries = nickInboxEntries(
      exportPadAddresses,
      { threads: [], decisions: indexInbox.decisions },
      pageSummaries,
      {
        pages: [
          {
            page: 'pages/invoice-template.md',
            state: 'read',
            changedTime: '2026-11-20T21:30:00.000Z',
            sections: [
              { id: 'tax-number', hash: 'a1' },
              { id: 'the-logo', hash: 'b2' },
            ],
            changedSections: [
              { id: 'tax-number', title: 'Tax number', hash: 'a1' },
              { id: 'the-logo', title: 'The logo', hash: 'b2' },
            ],
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
            page: 'pages/retry-limit.md',
            state: 'read',
            changedTime: '2026-11-20T21:15:00.000Z',
            sections: [{ id: 'what-counts', hash: 'c3' }],
            changedSections: [{ id: 'what-counts', title: 'What counts', hash: 'c3' }],
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
      undefined,
    )
    expect(
      entries.map((entry) => [
        entry.kind,
        entry.heading,
        entry.where,
        entry.quote,
        entry.shownTime,
      ]),
    ).toStrictEqual([
      [
        'decision',
        'A decision to make',
        'Invoice export',
        'Will the export job retry 8 times?',
        '20 Nov, 21:05',
      ],
      ['section', 'Updates to Invoice template', '2 sections changed', undefined, '20 Nov, 21:30'],
      [
        'page',
        'A new page',
        'retry-limit.md › 2.1 Wait between retries',
        'Each retry waits twice as long as the retry before it.',
        '20 Nov, 21:20',
      ],
      ['section', 'Updates to retry-limit.md', '1 section changed', undefined, '20 Nov, 21:15'],
      [
        'page',
        'A new page',
        'retry-limit.md › 2.1.1 First retry',
        'The first retry waits 30 seconds.',
        '20 Nov, 21:10',
      ],
    ])
    expect(entries.map((entry) => entry.href)).toStrictEqual([
      `/${exportPad}/#d-1`,
      `/${exportPad}/invoice-template.md#tax-number`,
      `/${exportPad}/wait-between-retries.md`,
      `/${exportPad}/retry-limit.md#what-counts`,
      `/${exportPad}/first-retry.md`,
    ])
  })

  it('lists the tasks and the subtasks that are assigned to Nick and are not done, after the decisions and before the updates to pages', () => {
    const assignment = {
      assignee: 'user',
      do: 'Ask Jo for the retry limit.\nJo is in the office on Mondays.',
      why: 'Jo only talks to Nick',
    } as const
    // Task 2 is still assigned to Nick although it has subtasks. Subtask 2.1 is assigned but done.
    const tracker: ProgressTracker = {
      ...progressTracker,
      tasks: progressTracker.tasks.map((task) => ({
        ...task,
        assignment: task.id === 't-1' ? undefined : assignment,
        subtasks: task.subtasks.map((subtask) => ({ ...subtask, assignment })),
      })),
    }
    const entries = nickInboxEntries(
      exportPadAddresses,
      { threads: [], decisions: indexInbox.decisions },
      pageSummaries,
      {
        pages: [
          {
            page: 'pages/first-retry.md',
            state: 'new',
            changedTime: '2026-11-20T21:10:00.000Z',
            sections: [],
            changedSections: [],
          },
        ],
      },
      tracker,
    )

    expect(entries.map((entry) => [entry.key, entry.kind, entry.href])).toStrictEqual([
      ['d-1', 'decision', `/${exportPad}/#d-1`],
      ['t-2', 'task', `/${exportPad}/progress-tracker#t-2`],
      ['t-5', 'task', `/${exportPad}/progress-tracker#t-5`],
      ['t-3', 'task', `/${exportPad}/progress-tracker#t-3`],
      ['page pages/first-retry.md', 'page', `/${exportPad}/first-retry.md`],
    ])
    expect(entries.slice(1, 4).map((entry) => [entry.heading, entry.task])).toStrictEqual([
      [
        'Write the invoice template',
        {
          id: 't-2',
          number: '2',
          state: 'in-progress',
          summary: 'Ask Jo for the retry limit.',
          canBeDone: false,
        },
      ],
      [
        'Show the bank details',
        {
          id: 't-5',
          number: '2.2',
          state: 'in-progress',
          summary: 'Ask Jo for the retry limit.',
          canBeDone: true,
        },
      ],
      [
        'Check the retry limit',
        {
          id: 't-3',
          number: '3',
          state: 'to-do',
          summary: 'Ask Jo for the retry limit.',
          canBeDone: true,
        },
      ],
    ])
  })
})

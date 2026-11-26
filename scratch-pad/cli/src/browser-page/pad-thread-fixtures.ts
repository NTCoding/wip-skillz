import { vi } from 'vitest'
import { type PageThread, type Thread } from './api-responses'

export const retryQuestion: PageThread = {
  id: 'c-1',
  type: 'comment',
  page: 'pages/index.md',
  anchor: {
    firstLine: 8,
    lastLine: 8,
    selectedText: 'retries 5 times',
    prefix: 'The job',
    suffix: '. See this section and the retry',
  },
  position: {
    kind: 'attached',
    firstLine: 8,
    lastLine: 8,
    text: 'retries 5 times',
    occurrence: 0,
    match: 'exact',
    score: 1,
  },
  waitsFor: 'nick',
  outcome: undefined,
  messages: [
    { author: 'nick', text: 'Is 5 retries enough?', time: '2026-11-20T21:09:00.000Z' },
    { author: 'agent', text: 'I have raised the limit to 8.', time: '2026-11-20T21:12:00.000Z' },
  ],
}

export const toneNote: PageThread = {
  id: 'g-1',
  type: 'grammar',
  page: 'pages/index.md',
  anchor: {
    firstLine: 3,
    lastLine: 4,
    selectedText: 'shows the tax number',
    prefix: 'to a CSV file. The invoice template',
    suffix: '.',
  },
  position: {
    kind: 'attached',
    firstLine: 3,
    lastLine: 4,
    text: 'shows the tax number',
    occurrence: 0,
    match: 'exact',
    score: 1,
  },
  waitsFor: 'agent',
  outcome: undefined,
  messages: [{ author: 'nick', text: 'Write who shows it.', time: '2026-11-20T21:10:00.000Z' }],
}

// The thread on subtask 2.2 of the progress tracker, which is assigned to Nick. The agent has
// replied to Nick.
export const bankDetailsThread: Thread = {
  id: 'c-7',
  type: 'comment',
  page: undefined,
  task: 't-5',
  anchor: undefined,
  position: undefined,
  waitsFor: 'nick',
  outcome: undefined,
  messages: [
    { author: 'nick', text: 'Which bank account is it?', time: '2026-11-20T21:14:00.000Z' },
    {
      author: 'agent',
      text: 'The account for the shop in Lyon.',
      time: '2026-11-20T21:15:00.000Z',
    },
  ],
}

// Returns the new thread c-9 on the task with the first message of Nick, as the server does.
export const fakeStartTaskThread = vi.fn((task: string, message: string) =>
  Promise.resolve<Thread>({
    ...bankDetailsThread,
    id: 'c-9',
    task,
    waitsFor: 'agent',
    messages: [{ author: 'nick', text: message, time: '2026-11-20T21:22:00.000Z' }],
  }),
)

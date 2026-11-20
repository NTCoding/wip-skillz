import { type Anchor, type Thread } from './thread'

export const retryAnchor: Anchor = {
  firstLine: 5,
  lastLine: 6,
  selectedText: 'The export job retries 5 times.',
}

export function aThread(changes: Partial<Thread>): Thread {
  return {
    id: 'c-1',
    type: 'comment',
    page: 'pages/index.md',
    anchor: retryAnchor,
    waitsFor: 'agent',
    outcome: undefined,
    messages: [
      {
        author: 'nick',
        text: 'Is 5 retries enough on a slow network?',
        time: '2026-03-14T09:30:00.000Z',
      },
    ],
    ...changes,
  }
}

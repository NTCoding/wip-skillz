import { type Anchor, type PageThread, type TaskThread } from './thread'

export const retryAnchor: Anchor = {
  firstLine: 5,
  lastLine: 6,
  selectedText: 'The export job retries 5 times.',
  prefix: '',
  suffix: 'Each retry waits 30 seconds.',
}

export function aThread(changes: Partial<PageThread>): PageThread {
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

// The thread on subtask 2.2 of trackerWithSubtasks, whose id is t-5
export function aTaskThread(changes: Partial<TaskThread>): TaskThread {
  return {
    id: 'c-4',
    type: 'comment',
    page: undefined,
    task: 't-5',
    anchor: undefined,
    waitsFor: 'agent',
    outcome: undefined,
    messages: [
      { author: 'nick', text: 'Which log should I check?', time: '2026-03-14T09:32:00.000Z' },
    ],
    ...changes,
  }
}

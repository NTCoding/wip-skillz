import { type QueuedItem, type Thread } from './api-responses'
import { type NewThread } from './scratch-pad-connection'

export const queuedComment: Extract<QueuedItem, { kind: 'comment' }> = {
  kind: 'comment',
  number: 1,
  page: 'pages/index.md',
  anchor: {
    firstLine: 3,
    lastLine: 4,
    selectedText: 'paid invoices',
    prefix: 'The export job writes the',
    suffix: 'of each shop to a CSV file.',
  },
  text: 'Only the paid ones?',
  time: '2026-11-20T21:14:00.000Z',
  position: {
    kind: 'attached',
    firstLine: 3,
    lastLine: 4,
    text: 'paid invoices',
    occurrence: 0,
    match: 'exact',
    score: 1,
  },
}

export const queuedReply: Extract<QueuedItem, { kind: 'reply' }> = {
  kind: 'reply',
  number: 2,
  thread: 'c-1',
  text: 'Can a shop ask for 10?',
  time: '2026-11-20T21:15:00.000Z',
}

// The outbox of the fake connection changes in the same way as the outbox on the server.
export function fakeOutbox(sentThread: Thread) {
  const outbox: QueuedItem[] = []
  return { items: outbox, actions: fakeOutboxActions(outbox, sentThread) }
}

function fakeOutboxActions(outbox: QueuedItem[], sentThread: Thread) {
  const nextNumber = (): number => Math.max(0, ...outbox.map((item) => item.number)) + 1
  return {
    outbox: () => Promise.resolve({ items: [...outbox] }),
    queueComment: (thread: NewThread) => {
      outbox.push({
        ...queuedComment,
        number: nextNumber(),
        page: thread.page,
        anchor: { ...queuedComment.anchor, selectedText: thread.selectedText },
        position: {
          kind: 'attached',
          firstLine: thread.firstLine,
          lastLine: thread.lastLine,
          text: thread.selectedText,
          occurrence: 0,
          match: 'exact',
          score: 1,
        },
        text: thread.message,
      })
      return Promise.resolve()
    },
    queueReply: (id: string, message: string) => {
      outbox.push({ ...queuedReply, number: nextNumber(), thread: id, text: message })
      return Promise.resolve()
    },
    editQueuedItem: (number: number, message: string) => {
      const edited = outbox.map((item) =>
        item.number === number ? { ...item, text: message } : item,
      )
      outbox.splice(0, outbox.length, ...edited)
      return Promise.resolve()
    },
    removeQueuedItem: (number: number) => {
      outbox.splice(
        outbox.findIndex((item) => item.number === number),
        1,
      )
      return Promise.resolve()
    },
    sendOutbox: () => {
      const sent = outbox.splice(0).map((item): Thread => ({
        ...sentThread,
        id: item.kind === 'reply' ? item.thread : `c-${item.number + 10}`,
        waitsFor: 'agent',
      }))
      return Promise.resolve(sent)
    },
  }
}

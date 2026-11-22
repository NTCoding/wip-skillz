import { describe, expect, it } from 'vitest'
import { aThread, retryAnchor } from '../threads/thread-fixtures'
import { EmptyMessageError, InvalidAnchorError, MissingAnchorError } from '../threads/thread'
import {
  editQueuedItem,
  findQueuedItem,
  NotQueueableError,
  queueComment,
  queueReply,
  UnknownQueuedItemError,
  type QueuedItem,
} from './outbox'

const time = '2026-03-14T09:30:00.000Z'

const queuedComment: QueuedItem = {
  kind: 'comment',
  number: 1,
  page: 'pages/index.md',
  anchor: retryAnchor,
  text: 'Is 5 retries enough?',
  time,
}

const queuedReply: QueuedItem = {
  kind: 'reply',
  number: 2,
  thread: 'c-1',
  text: 'What about a slow network?',
  time,
}

describe('queueComment', () => {
  it('returns a queued comment with the page, the anchor, the text and the time', () => {
    expect(
      queueComment({
        type: 'comment',
        page: 'pages/index.md',
        anchor: retryAnchor,
        text: 'Is 5 retries enough?',
        time,
      }),
    ).toStrictEqual({
      kind: 'comment',
      page: 'pages/index.md',
      anchor: retryAnchor,
      text: 'Is 5 retries enough?',
      time,
    })
  })

  it('throws NotQueueableError when the thread is a grammar note', () => {
    const queue = () =>
      queueComment({
        type: 'grammar',
        page: 'pages/index.md',
        anchor: retryAnchor,
        text: 'x',
        time,
      })

    expect(queue).toThrow(NotQueueableError)
    expect(queue).toThrow(
      'Only a comment or a reply to a comment can be added to the outbox, so a grammar note is sent straight away.',
    )
  })

  it('throws MissingAnchorError when the comment doesn’t have an anchor', () => {
    expect(() =>
      queueComment({ type: 'comment', page: 'pages/index.md', anchor: undefined, text: 'x', time }),
    ).toThrow(MissingAnchorError)
  })

  it('throws InvalidAnchorError when the last line of the anchor is before its first line', () => {
    expect(() =>
      queueComment({
        type: 'comment',
        page: 'pages/index.md',
        anchor: { ...retryAnchor, firstLine: 6, lastLine: 5 },
        text: 'x',
        time,
      }),
    ).toThrow(InvalidAnchorError)
  })

  it('throws EmptyMessageError when the text is only spaces', () => {
    expect(() =>
      queueComment({
        type: 'comment',
        page: 'pages/index.md',
        anchor: retryAnchor,
        text: ' ',
        time,
      }),
    ).toThrow(EmptyMessageError)
  })
})

describe('queueReply', () => {
  it('returns a queued reply to the thread when the thread is a comment', () => {
    expect(queueReply(aThread({ id: 'c-3' }), 'What about a slow network?', time)).toStrictEqual({
      kind: 'reply',
      thread: 'c-3',
      text: 'What about a slow network?',
      time,
    })
  })

  it('throws NotQueueableError when the thread is an improvement note', () => {
    const queue = () =>
      queueReply(aThread({ id: 'i-1', type: 'improvement' }), 'Add an example.', time)

    expect(queue).toThrow(NotQueueableError)
    expect(queue).toThrow(
      'Only a comment or a reply to a comment can be added to the outbox, so a reply to i-1 is sent straight away.',
    )
  })

  it('throws EmptyMessageError when the reply is empty', () => {
    expect(() => queueReply(aThread({}), '', time)).toThrow(EmptyMessageError)
  })
})

describe('findQueuedItem', () => {
  it('returns the item with the number', () => {
    expect(findQueuedItem([queuedComment, queuedReply], 2)).toBe(queuedReply)
  })

  it('throws UnknownQueuedItemError when no item has the number', () => {
    const find = () => findQueuedItem([queuedComment], 2)

    expect(find).toThrow(UnknownQueuedItemError)
    expect(find).toThrow(
      "There isn't any item 2 in the outbox. It might have been sent or removed already, so reload the page.",
    )
  })
})

describe('editQueuedItem', () => {
  it('returns the item with the new text and keeps everything else', () => {
    expect(editQueuedItem([queuedComment, queuedReply], 1, 'Is 8 retries enough?')).toStrictEqual({
      ...queuedComment,
      text: 'Is 8 retries enough?',
    })
  })

  it('throws EmptyMessageError when the new text is empty', () => {
    expect(() => editQueuedItem([queuedReply], 2, '  ')).toThrow(EmptyMessageError)
  })
})

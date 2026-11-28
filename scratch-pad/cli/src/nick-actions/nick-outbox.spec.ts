import { afterEach, describe, expect, it } from 'vitest'
import { NotQueueableError, UnknownQueuedItemError } from '../outbox/outbox'
import { PadDbFailureError } from '../scratch-pad-folder/pad-db-errors'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import {
  exportJobScratchPad,
  freezeClockAt,
  refuseNewEvents,
  removeTemporaryHomes,
  temporaryHome,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { retryAnchor } from '../threads/thread-fixtures'
import {
  AnchorOutsidePageError,
  nickComments,
  nickEditsQueuedItem,
  nickQueuesComment,
  nickQueuesReply,
  nickRemovesQueuedItem,
  nickResolves,
  nickSendsOutbox,
} from './nick-actions'

const time = '2026-03-14T09:30:00.000Z'

freezeClockAt(time)

afterEach(() => {
  removeTemporaryHomes()
})

function queueRetryComment(folder: ScratchPadFolder, text = 'Is 5 retries enough?') {
  return nickQueuesComment(folder, { type: 'comment', page: 'index', anchor: retryAnchor, text })
}

function padWithSentComment(): ScratchPadFolder {
  const folder = exportJobScratchPad(temporaryHome())
  nickComments(folder, { type: 'comment', page: 'index', anchor: retryAnchor, text: 'Why 5?' })
  return folder
}

describe('nickQueuesComment', () => {
  it('saves the comment in the outbox with the page that was found and the copies on the page', () => {
    const folder = exportJobScratchPad(temporaryHome())

    expect(queueRetryComment(folder)).toStrictEqual({
      kind: 'comment',
      number: 1,
      page: 'pages/index.md',
      anchor: { ...retryAnchor, copiesOnPage: 1 },
      text: 'Is 5 retries enough?',
      time,
    })
    expect(folder.read((pad) => pad.readOutbox().length)).toBe(1)
  })

  it('opens no thread and appends an item-queued event by Nick without an item', () => {
    const folder = exportJobScratchPad(temporaryHome())

    queueRetryComment(folder)

    expect(
      folder.read((pad) => ({ threads: pad.readThreads(), events: pad.readEvents() })),
    ).toStrictEqual({
      threads: [],
      events: [{ number: 1, time, kind: 'item-queued', by: 'nick', item: undefined }],
    })
  })

  it('throws NotQueueableError and saves nothing when the comment is a grammar note', () => {
    const folder = exportJobScratchPad(temporaryHome())

    expect(() =>
      nickQueuesComment(folder, { type: 'grammar', page: 'index', anchor: retryAnchor, text: 'x' }),
    ).toThrow(NotQueueableError)
    expect(folder.read((pad) => pad.readOutbox())).toStrictEqual([])
  })

  it("throws AnchorOutsidePageError when the lines of the comment aren't in the page", () => {
    const folder = exportJobScratchPad(temporaryHome())

    expect(() =>
      nickQueuesComment(folder, {
        type: 'comment',
        page: 'index',
        anchor: { ...retryAnchor, firstLine: 40, lastLine: 41 },
        text: 'x',
      }),
    ).toThrow(AnchorOutsidePageError)
  })

  it('saves nothing in the outbox when the event cannot be saved', () => {
    const folder = exportJobScratchPad(temporaryHome())
    refuseNewEvents(folder)

    expect(() => queueRetryComment(folder)).toThrow(PadDbFailureError)
    expect(folder.read((pad) => pad.readOutbox())).toStrictEqual([])
  })
})

describe('nickQueuesReply', () => {
  it('saves the reply in the outbox and leaves the thread as it was', () => {
    const folder = padWithSentComment()
    const before = folder.read((pad) => pad.readThread('c-1'))

    expect(nickQueuesReply(folder, 'c-1', 'And on a slow network?')).toStrictEqual({
      kind: 'reply',
      number: 1,
      thread: 'c-1',
      text: 'And on a slow network?',
      time,
    })
    expect(folder.read((pad) => pad.readThread('c-1'))).toStrictEqual(before)
    expect(folder.read((pad) => pad.readEvents().at(-1)?.kind)).toBe('item-queued')
  })

  it('throws NotQueueableError when the thread is an improvement note', () => {
    const folder = exportJobScratchPad(temporaryHome())
    nickComments(folder, { type: 'improvement', page: 'index', anchor: undefined, text: 'More.' })

    expect(() => nickQueuesReply(folder, 'i-1', 'An example too.')).toThrow(NotQueueableError)
  })
})

describe('nickEditsQueuedItem', () => {
  it('saves and returns the item with the new text and appends a queued-item-edited event', () => {
    const folder = exportJobScratchPad(temporaryHome())
    queueRetryComment(folder)

    expect(nickEditsQueuedItem(folder, 1, 'Is 8 retries enough?').text).toBe('Is 8 retries enough?')
    expect(
      folder.read((pad) => {
        const [first] = pad.readOutbox()
        return [first?.kind === 'comment' ? first.text : undefined, pad.readEvents().at(-1)?.kind]
      }),
    ).toStrictEqual(['Is 8 retries enough?', 'queued-item-edited'])
  })

  it('throws UnknownQueuedItemError when the number is unknown', () => {
    expect(() => nickEditsQueuedItem(exportJobScratchPad(temporaryHome()), 1, 'x')).toThrow(
      UnknownQueuedItemError,
    )
  })
})

describe('nickRemovesQueuedItem', () => {
  it('removes the item and appends a queued-item-removed event', () => {
    const folder = exportJobScratchPad(temporaryHome())
    queueRetryComment(folder)

    nickRemovesQueuedItem(folder, 1)

    expect(
      folder.read((pad) => ({ outbox: pad.readOutbox(), kind: pad.readEvents().at(-1)?.kind })),
    ).toStrictEqual({ outbox: [], kind: 'queued-item-removed' })
  })

  it('throws UnknownQueuedItemError when the number is unknown', () => {
    expect(() => nickRemovesQueuedItem(exportJobScratchPad(temporaryHome()), 3)).toThrow(
      UnknownQueuedItemError,
    )
  })
})

describe('nickSendsOutbox', () => {
  it('opens a thread for each queued comment with the next ids in the order they were queued', () => {
    const folder = padWithSentComment()
    queueRetryComment(folder, 'Is 5 retries enough?')
    queueRetryComment(folder, 'Is 30 seconds enough?')

    const sent = nickSendsOutbox(folder)

    expect(
      sent.map((thread) => [thread.id, thread.waitsFor, thread.messages[0].text]),
    ).toStrictEqual([
      ['c-2', 'agent', 'Is 5 retries enough?'],
      ['c-3', 'agent', 'Is 30 seconds enough?'],
    ])
    expect(folder.read((pad) => pad.readThread('c-2').anchor)).toStrictEqual({
      ...retryAnchor,
      copiesOnPage: 1,
    })
  })

  it('adds each queued reply to its thread, which then waits for the agent again', () => {
    const folder = padWithSentComment()
    nickResolves(folder, 'c-1')
    nickQueuesReply(folder, 'c-1', 'And on a slow network?')
    nickQueuesReply(folder, 'c-1', 'And at night?')

    const [thread] = nickSendsOutbox(folder)

    expect(thread?.waitsFor).toBe('agent')
    expect(thread?.messages.map((message) => message.text)).toStrictEqual([
      'Why 5?',
      'And on a slow network?',
      'And at night?',
    ])
  })

  it('returns each thread once, in the state after its last queued item', () => {
    const folder = padWithSentComment()
    nickQueuesReply(folder, 'c-1', 'And on a slow network?')
    queueRetryComment(folder)
    nickQueuesReply(folder, 'c-1', 'And at night?')

    expect(
      nickSendsOutbox(folder).map((thread) => [thread.id, thread.messages.length]),
    ).toStrictEqual([
      ['c-2', 1],
      ['c-1', 3],
    ])
  })

  it('appends the same events as a send of each item and then an outbox-sent event, and empties the outbox', () => {
    const folder = padWithSentComment()
    nickQueuesReply(folder, 'c-1', 'And on a slow network?')
    queueRetryComment(folder)

    nickSendsOutbox(folder)

    expect(
      folder.read((pad) => ({
        outbox: pad.readOutbox(),
        events: pad
          .readEvents()
          .slice(-3)
          .map((event) => [event.kind, event.by, event.item]),
      })),
    ).toStrictEqual({
      outbox: [],
      events: [
        ['thread-replied', 'nick', 'c-1'],
        ['thread-opened', 'nick', 'c-2'],
        ['outbox-sent', 'nick', undefined],
      ],
    })
  })

  it('gives each sent message the time of the send rather than the time it was queued', () => {
    const folder = exportJobScratchPad(temporaryHome())
    folder.change((pad) =>
      pad.saveQueuedItem({
        kind: 'comment',
        page: 'pages/index.md',
        anchor: retryAnchor,
        text: 'Queued yesterday',
        time: '2026-03-13T09:30:00.000Z',
      }),
    )

    expect(nickSendsOutbox(folder)[0]?.messages[0].time).toBe(time)
  })

  it('returns nothing and appends no event when the outbox is empty', () => {
    const folder = exportJobScratchPad(temporaryHome())

    expect(nickSendsOutbox(folder)).toStrictEqual([])
    expect(folder.read((pad) => pad.readEvents())).toStrictEqual([])
  })

  it('sends nothing and keeps the outbox when an event cannot be saved', () => {
    const folder = exportJobScratchPad(temporaryHome())
    queueRetryComment(folder)
    refuseNewEvents(folder)

    expect(() => nickSendsOutbox(folder)).toThrow(PadDbFailureError)
    expect(folder.read((pad) => [pad.readThreads().length, pad.readOutbox().length])).toStrictEqual(
      [0, 1],
    )
  })
})

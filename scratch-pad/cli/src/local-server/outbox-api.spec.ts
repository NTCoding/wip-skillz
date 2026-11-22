import { afterEach, describe, expect, it } from 'vitest'
import { nickComments } from '../nick-actions/nick-actions'
import { UnknownQueuedItemError } from '../outbox/outbox'
import {
  exportJobPadName,
  exportJobScratchPad,
  freezeClockAt,
  removeTemporaryHomes,
  temporaryHome,
  writeFileInPad,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { retryAnchor } from '../threads/thread-fixtures'
import { respondToApiRequest, type ApiResponse } from './scratch-pad-api'

const time = '2026-03-14T09:30:00.000Z'
const padApi = `/api/scratch-pads/${exportJobPadName}`

freezeClockAt(time)

afterEach(() => {
  removeTemporaryHomes()
})

function post(home: string, path: string, body: unknown): ApiResponse {
  return respondToApiRequest({ home, method: 'POST', path, body: JSON.stringify(body) })
}

function getOutbox(home: string): unknown {
  return jsonBody(respondToApiRequest({ home, method: 'GET', path: `${padApi}/outbox`, body: '' }))
}

function jsonBody(response: ApiResponse): unknown {
  return response.kind === 'json' ? response.body : response.kind
}

const retryComment = {
  type: 'comment',
  page: 'pages/index.md',
  ...retryAnchor,
  message: 'Is 5 retries enough?',
}

const queuedRetryComment = {
  kind: 'comment',
  number: 1,
  page: 'pages/index.md',
  anchor: { ...retryAnchor, copiesOnPage: 1 },
  text: 'Is 5 retries enough?',
  time,
  position: {
    kind: 'attached',
    firstLine: 5,
    lastLine: 6,
    text: 'The export job retries 5 times.',
    occurrence: 0,
    match: 'exact',
    score: 1,
  },
}

function homeWithSentComment(): string {
  const home = temporaryHome()
  nickComments(exportJobScratchPad(home), {
    type: 'comment',
    page: 'index',
    anchor: retryAnchor,
    text: 'Why 5?',
  })
  return home
}

describe('respondToApiRequest for the outbox', () => {
  it('returns an empty outbox when Nick hasn’t queued anything', () => {
    const home = temporaryHome()
    exportJobScratchPad(home)

    expect(getOutbox(home)).toStrictEqual({ items: [] })
  })

  it('returns 201 and the outbox with the position of the queued comment when Nick queues a comment', () => {
    const home = temporaryHome()
    exportJobScratchPad(home)

    const response = post(home, `${padApi}/outbox/comments`, retryComment)

    expect(response).toMatchObject({ kind: 'json', status: 201 })
    expect(jsonBody(response)).toStrictEqual({ items: [queuedRetryComment] })
  })

  it('returns a detached position when the text of a queued comment has been deleted from the page', () => {
    const home = temporaryHome()
    const folder = exportJobScratchPad(home)
    post(home, `${padApi}/outbox/comments`, retryComment)
    writeFileInPad(folder, 'pages/index.md', '# Export job\n\nThe job runs every night.\n')

    expect(getOutbox(home)).toStrictEqual({
      items: [{ ...queuedRetryComment, position: { kind: 'detached' } }],
    })
  })

  it('returns 201 and the outbox with the queued reply when Nick queues a reply', () => {
    const home = homeWithSentComment()

    const response = post(home, `${padApi}/outbox/replies`, {
      thread: 'c-1',
      message: 'And on a slow network?',
    })

    expect(response).toMatchObject({ kind: 'json', status: 201 })
    expect(jsonBody(response)).toStrictEqual({
      items: [{ kind: 'reply', number: 1, thread: 'c-1', text: 'And on a slow network?', time }],
    })
  })

  it('returns the outbox with the new text when Nick edits a queued item', () => {
    const home = homeWithSentComment()
    post(home, `${padApi}/outbox/replies`, { thread: 'c-1', message: 'And on a slow network?' })

    expect(
      jsonBody(post(home, `${padApi}/outbox/1`, { message: 'And on a fast network?' })),
    ).toStrictEqual({
      items: [{ kind: 'reply', number: 1, thread: 'c-1', text: 'And on a fast network?', time }],
    })
  })

  it('returns the outbox without the item when Nick removes a queued item', () => {
    const home = temporaryHome()
    exportJobScratchPad(home)
    post(home, `${padApi}/outbox/comments`, retryComment)

    expect(jsonBody(post(home, `${padApi}/outbox/1/delete`, {}))).toStrictEqual({ items: [] })
  })

  it('throws UnknownQueuedItemError when Nick removes an item that isn’t in the outbox', () => {
    const home = temporaryHome()
    exportJobScratchPad(home)

    expect(() => post(home, `${padApi}/outbox/1/delete`, {})).toThrow(UnknownQueuedItemError)
  })

  it('returns the sent threads with their positions and empties the outbox when Nick sends the outbox', () => {
    const home = homeWithSentComment()
    post(home, `${padApi}/outbox/comments`, retryComment)

    const sent = jsonBody(post(home, `${padApi}/outbox/send`, {}))

    expect(sent).toMatchObject({
      threads: [{ id: 'c-2', waitsFor: 'agent', position: { kind: 'attached' } }],
    })
    expect(getOutbox(home)).toStrictEqual({ items: [] })
  })
})

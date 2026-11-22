import { afterEach, describe, expect, it } from 'vitest'
import { retryAnchor } from '../threads/thread-fixtures'
import {
  exportJobPadName,
  firstVersionScratchPad,
  inMemoryPadDb,
  removeTemporaryHomes,
  temporaryHome,
} from './scratch-pad-folder-fixtures'
import { StoredOutbox } from './stored-outbox'

const time = '2026-03-14T09:30:00.000Z'

afterEach(() => {
  removeTemporaryHomes()
})

function storedOutbox(): StoredOutbox {
  const db = inMemoryPadDb()
  db.exec(
    `INSERT INTO threads (id, type, page, first_line, last_line, selected_text, waits_for)
     VALUES ('c-1', 'comment', 'pages/index.md', 5, 6, 'retries', 'nick');`,
  )
  return new StoredOutbox(db, exportJobPadName)
}

const comment = {
  kind: 'comment',
  page: 'pages/index.md',
  anchor: { ...retryAnchor, copiesOnPage: 1 },
  text: 'Is 5 retries enough?',
  time,
} as const

const reply = { kind: 'reply', thread: 'c-1', text: 'And on a slow network?', time } as const

describe('StoredOutbox', () => {
  it('numbers the saved items from 1 and reads them back in the order of the numbers', () => {
    const stored = storedOutbox()

    expect([stored.save(comment), stored.save(reply)]).toStrictEqual([
      { number: 1, ...comment },
      { number: 2, ...reply },
    ])
    expect(stored.read()).toStrictEqual([
      { number: 1, ...comment },
      { number: 2, ...reply },
    ])
  })

  it('reads a queued comment without the context and without the copies when they weren’t saved', () => {
    const stored = storedOutbox()
    const anchor = {
      firstLine: 5,
      lastLine: 6,
      selectedText: 'retries',
      prefix: undefined,
      suffix: undefined,
    }
    stored.save({ ...comment, anchor })

    expect(stored.read()).toStrictEqual([{ number: 1, ...comment, anchor }])
  })

  it('never gives a new item the number of a removed item, even when the removed item was the last one', () => {
    const stored = storedOutbox()
    stored.save(comment)
    stored.save(reply)
    stored.delete(2)

    expect(stored.save(reply).number).toBe(3)
  })

  it('replaces only the text of the item with the same number when it is updated', () => {
    const stored = storedOutbox()
    stored.save(comment)
    stored.save(reply)
    stored.updateText({ number: 2, ...reply, text: 'And on a fast network?' })

    expect(stored.read()).toStrictEqual([
      { number: 1, ...comment },
      { number: 2, ...reply, text: 'And on a fast network?' },
    ])
  })

  it('removes only the item with the number when it is deleted', () => {
    const stored = storedOutbox()
    stored.save(comment)
    stored.save(reply)
    stored.delete(1)

    expect(stored.read()).toStrictEqual([{ number: 2, ...reply }])
  })

  it('saves the items of a scratch pad of version 1 once pad.db is migrated', () => {
    const folder = firstVersionScratchPad(temporaryHome())
    folder.change((pad) => pad.saveQueuedItem(reply))

    expect(folder.read((pad) => pad.readOutbox())).toStrictEqual([{ number: 1, ...reply }])
  })
})

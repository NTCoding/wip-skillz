import { describe, expect, it } from 'vitest'
import { InvalidItemIdError } from '../items/item-id'
import { aThread } from '../threads/thread-fixtures'
import { BrokenPadDbError } from './pad-db-errors'
import { exportJobPadName, inMemoryPadDb } from './scratch-pad-folder-fixtures'
import { StoredThreads, UnknownThreadError } from './stored-threads'

const time = '2026-03-14T09:30:00.000Z'

const storedThreads = () => new StoredThreads(inMemoryPadDb(), exportJobPadName)

describe('StoredThreads', () => {
  it('reads back the threads in the order of their numbers when they were written in another order', () => {
    const stored = storedThreads()
    const threads = [
      aThread({ id: 'c-2' }),
      aThread({ id: 'c-10' }),
      aThread({ id: 'g-1', type: 'grammar' }),
    ]
    threads.forEach((thread) => stored.write(thread))

    expect(stored.readAll()).toStrictEqual([threads[0], threads[1], threads[2]])
  })

  it('reads back an improvement note without an anchor when the note is closed', () => {
    const stored = storedThreads()
    const note = aThread({
      id: 'i-1',
      type: 'improvement',
      anchor: undefined,
      waitsFor: 'nobody',
      outcome: 'Added an example of a retry.',
    })
    stored.write(note)

    expect(stored.read('i-1')).toStrictEqual(note)
  })

  it('replaces the messages of a thread when the thread is written again', () => {
    const stored = storedThreads()
    const first = aThread({})
    const reply = { author: 'agent', text: 'I raised the limit to 8.', time } as const
    stored.write(first)
    stored.write({ ...first, waitsFor: 'nick', messages: [...first.messages, reply] })

    expect(stored.readAll()[0]?.messages).toStrictEqual([...first.messages, reply])
  })

  it('throws UnknownThreadError that recommends the inbox of the type when the thread does not exist', () => {
    const read = () => storedThreads().read('g-2')

    expect(read).toThrow(UnknownThreadError)
    expect(read).toThrow(
      `There isn't any thread called g-2 in 2026-03-14-export-job. Run "scratch-pad inbox --pad 2026-03-14-export-job --all --type grammar" to list the threads that wait for the agent.`,
    )
  })

  it('throws InvalidItemIdError when the id of a thread is invalid', () => {
    const read = () => storedThreads().read('progress-tracker')

    expect(read).toThrow(InvalidItemIdError)
    expect(read).toThrow(`"progress-tracker" isn't an id.`)
  })

  it('throws BrokenPadDbError when a thread does not have any messages', () => {
    const db = inMemoryPadDb()
    db.exec(`INSERT INTO threads (id, type, page, waits_for)
             VALUES ('i-1', 'improvement', 'pages/index.md', 'agent')`)
    const read = () => new StoredThreads(db, exportJobPadName).readAll()

    expect(read).toThrow(BrokenPadDbError)
    expect(read).toThrow(
      "pad.db in 2026-03-14-export-job is broken: the thread i-1 doesn't have any messages.",
    )
  })
})

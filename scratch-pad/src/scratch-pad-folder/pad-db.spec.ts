import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { nothingPrinted } from '../agent-inbox/agent-inbox'
import { aDecisionAnswer } from '../decisions/decision-answer-fixtures'
import { InvalidItemIdError } from '../items/item-id'
import { aThread } from '../threads/thread-fixtures'
import { PadDb, UnknownDecisionError, UnknownThreadError } from './pad-db'
import { BrokenPadDbError } from './pad-row'
import { padSchema } from './pad-schema'

const time = '2026-03-14T09:30:00.000Z'
const goalSet = { time, kind: 'goal-set', by: 'agent', item: undefined } as const
const threadOpened = { time, kind: 'thread-opened', by: 'nick', item: 'c-1' } as const
const tracker = {
  title: 'Export job',
  goal: 'Ship the export job.',
  tasks: [
    { number: 1, title: 'Write the retry policy', state: 'done' },
    { number: 2, title: 'Write the invoice template', state: 'in-progress' },
  ],
} as const

function inMemoryPad(): { readonly pad: PadDb; readonly db: DatabaseSync } {
  const db = new DatabaseSync(':memory:')
  db.exec(padSchema)
  return { pad: new PadDb(db, '2026-03-14-export-job'), db }
}

describe('PadDb', () => {
  it('reads back the progress tracker it wrote', () => {
    const { pad } = inMemoryPad()
    pad.writeProgressTracker(tracker)

    expect(pad.readProgressTracker()).toStrictEqual(tracker)
  })

  it('replaces the tasks when the progress tracker is written again', () => {
    const { pad } = inMemoryPad()
    pad.writeProgressTracker(tracker)
    pad.writeProgressTracker({ title: 'Export job', goal: undefined, tasks: [] })

    expect(pad.readProgressTracker()).toStrictEqual({
      title: 'Export job',
      goal: undefined,
      tasks: [],
    })
  })

  it('throws BrokenPadDbError when the progress tracker is missing', () => {
    const read = () => inMemoryPad().pad.readProgressTracker()

    expect(read).toThrow(BrokenPadDbError)
    expect(read).toThrow(
      "pad.db in 2026-03-14-export-job is broken: the table progress_tracker doesn't have any rows.",
    )
  })

  it('reads back the threads it wrote in the order of their numbers', () => {
    const { pad } = inMemoryPad()
    const threads = [
      aThread({ id: 'c-2' }),
      aThread({ id: 'c-10' }),
      aThread({ id: 'g-1', type: 'grammar' }),
    ]
    threads.forEach((thread) => pad.writeThread(thread))

    expect(pad.readThreads()).toStrictEqual([threads[0], threads[1], threads[2]])
  })

  it('reads back a closed improvement note without an anchor', () => {
    const { pad } = inMemoryPad()
    const note = aThread({
      id: 'i-1',
      type: 'improvement',
      anchor: undefined,
      waitsFor: 'nobody',
      outcome: 'Added an example of a retry.',
    })
    pad.writeThread(note)

    expect(pad.readThread('i-1')).toStrictEqual(note)
  })

  it('replaces the messages of a thread when the thread is written again', () => {
    const { pad } = inMemoryPad()
    const first = aThread({})
    const reply = { author: 'agent', text: 'I raised the limit to 8.', time } as const
    pad.writeThread(first)
    pad.writeThread({ ...first, waitsFor: 'nick', messages: [...first.messages, reply] })

    expect(pad.readThreads()[0]?.messages).toStrictEqual([...first.messages, reply])
  })

  it('throws UnknownThreadError that recommends the inbox of the type of the id', () => {
    const read = () => inMemoryPad().pad.readThread('g-2')

    expect(read).toThrow(UnknownThreadError)
    expect(read).toThrow(
      `There isn't any thread called g-2 in 2026-03-14-export-job. Run "scratch-pad inbox --all --type grammar" to list the threads that wait for the agent.`,
    )
  })

  it('throws InvalidItemIdError when the id of a thread is invalid', () => {
    const read = () => inMemoryPad().pad.readThread('progress-tracker')

    expect(read).toThrow(InvalidItemIdError)
    expect(read).toThrow(`"progress-tracker" isn't an id.`)
  })

  it('throws BrokenPadDbError when a thread does not have any messages', () => {
    const { pad, db } = inMemoryPad()
    db.exec(`INSERT INTO threads (id, type, page, waits_for)
             VALUES ('i-1', 'improvement', 'pages/index.md', 'agent')`)

    expect(() => pad.readThreads()).toThrow(BrokenPadDbError)
    expect(() => pad.readThreads()).toThrow(
      "pad.db in 2026-03-14-export-job is broken: the thread i-1 doesn't have any messages.",
    )
  })

  it('reads back the decision answers it wrote in the order of their numbers', () => {
    const { pad } = inMemoryPad()
    const answers = [
      aDecisionAnswer({ id: 'd-10', answer: { written: 'Only for companies.' } }),
      aDecisionAnswer({ id: 'd-2', seenByAgent: true }),
    ]
    answers.forEach((answer) => pad.writeDecisionAnswer(answer))

    expect(pad.readDecisionAnswers()).toStrictEqual([answers[1], answers[0]])
  })

  it('replaces a decision answer that has the same id', () => {
    const { pad } = inMemoryPad()
    pad.writeDecisionAnswer(aDecisionAnswer({}))
    pad.writeDecisionAnswer(aDecisionAnswer({ answer: { choice: 'alternative' } }))

    expect(pad.readDecisionAnswer('d-1').answer).toStrictEqual({ choice: 'alternative' })
  })

  it('throws UnknownDecisionError when the decision answer does not exist', () => {
    const read = () => inMemoryPad().pad.readDecisionAnswer('d-4')

    expect(read).toThrow(UnknownDecisionError)
    expect(read).toThrow("There isn't any answered decision called d-4 in 2026-03-14-export-job.")
  })

  it('reads back the events it appended in their order', () => {
    const { pad } = inMemoryPad()
    pad.appendEvent(goalSet)
    pad.appendEvent(threadOpened)

    expect(pad.readEvents()).toStrictEqual([
      { number: 1, ...goalSet },
      { number: 2, ...threadOpened },
    ])
  })

  it('returns the appended event with the number that pad.db gave it', () => {
    const { pad } = inMemoryPad()
    pad.appendEvent(goalSet)

    expect(pad.appendEvent(threadOpened)).toStrictEqual({ number: 2, ...threadOpened })
  })

  it('never gives a number twice even when the events were deleted', () => {
    const { pad, db } = inMemoryPad()
    pad.appendEvent(goalSet)
    pad.appendEvent(goalSet)
    db.exec('DELETE FROM events')

    expect(pad.appendEvent(threadOpened).number).toBe(3)
  })

  it('reads back the decision log it saved in the order of the numbers', () => {
    const { pad } = inMemoryPad()
    const log = [
      { number: 1, time, source: 'chat', text: 'Keep 5 retries.', decision: undefined },
      { number: 2, time, source: 'page', text: 'Show the tax number.', decision: 'd-1' },
    ] as const
    pad.saveDecisionLogEntry(log[1])
    pad.saveDecisionLogEntry(log[0])

    expect(pad.readDecisionLog()).toStrictEqual(log)
  })

  it('replaces the log entry that has the same number', () => {
    const { pad } = inMemoryPad()
    const entry = { number: 1, time, source: 'page', text: 'Keep 5.', decision: 'd-1' } as const
    pad.saveDecisionLogEntry(entry)
    pad.saveDecisionLogEntry({ ...entry, text: 'Make it 7.' })

    expect(pad.readDecisionLog()).toStrictEqual([{ ...entry, text: 'Make it 7.' }])
  })

  it('reads nothing printed when the agent inbox has not printed anything yet', () => {
    expect(inMemoryPad().pad.readLastPrintedEvents()).toStrictEqual(nothingPrinted)
  })

  it('reads back the last printed events it wrote', () => {
    const { pad } = inMemoryPad()
    const lastPrinted = { comment: 7, decision: 6, grammar: 3, improvement: 0 }
    pad.writeLastPrintedEvents(nothingPrinted)
    pad.writeLastPrintedEvents(lastPrinted)

    expect(pad.readLastPrintedEvents()).toStrictEqual(lastPrinted)
  })
})

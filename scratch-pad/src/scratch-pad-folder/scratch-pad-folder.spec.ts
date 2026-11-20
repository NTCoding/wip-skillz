import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { nothingPrinted } from '../agent-inbox/agent-inbox'
import { aDecisionAnswer } from '../decisions/decision-answer-fixtures'
import { InvalidItemIdError } from '../items/item-id'
import { aThread } from '../threads/thread-fixtures'
import { BrokenFileError } from './json-fields'
import { ScratchPadFolder, UnknownDecisionError, UnknownThreadError } from './scratch-pad-folder'
import {
  exportJobIndexPage,
  exportJobScratchPad,
  removeTemporaryHomes,
  temporaryHome,
  writeFileInPad,
} from './scratch-pad-folder-fixtures'

const time = '2026-03-14T09:30:00.000Z'
const goalSet = { number: 1, time, kind: 'goal-set', by: 'agent', item: undefined } as const
const threadOpened = { number: 2, time, kind: 'thread-opened', by: 'nick', item: 'c-1' } as const

describe('ScratchPadFolder', () => {
  afterEach(() => {
    removeTemporaryHomes()
  })

  it('creates the folders, the index page, the progress tracker and the agent inbox', () => {
    const folder = exportJobScratchPad(temporaryHome())
    expect(
      readdirSync(folder.path).toSorted((first, second) => first.localeCompare(second)),
    ).toStrictEqual([
      'agent-inbox.json',
      'decision-answers',
      'pages',
      'progress-tracker.json',
      'threads',
    ])
  })

  it('is recognised as a scratch pad because it has a progress tracker', () => {
    const folder = exportJobScratchPad(temporaryHome())
    expect(ScratchPadFolder.isScratchPad(folder.path)).toBe(true)
  })

  it('is named after its folder', () => {
    const folder = exportJobScratchPad(temporaryHome())
    expect(folder.name).toBe('2026-03-14-export-job')
  })

  it('writes the progress tracker as readable JSON', () => {
    const folder = exportJobScratchPad(temporaryHome())
    expect(readFileSync(join(folder.path, 'progress-tracker.json'), 'utf8')).toBe(
      '{\n  "title": "Export job",\n  "tasks": []\n}\n',
    )
  })

  it('reads back the progress tracker it wrote', () => {
    const folder = exportJobScratchPad(temporaryHome())
    const tracker = { title: 'Export job', goal: 'Ship it.', tasks: [] }
    folder.writeProgressTracker(tracker)

    expect(folder.readProgressTracker()).toStrictEqual(tracker)
  })

  it('reads back the threads it wrote in the order of their numbers', () => {
    const folder = exportJobScratchPad(temporaryHome())
    const threads = [
      aThread({ id: 'c-2' }),
      aThread({ id: 'c-10' }),
      aThread({ id: 'g-1', type: 'grammar' }),
    ]
    threads.forEach((thread) => folder.writeThread(thread))

    expect(folder.readThreads().map((thread) => thread.id)).toStrictEqual(['c-2', 'c-10', 'g-1'])
  })

  it('leaves no temporary file behind after a write', () => {
    const folder = exportJobScratchPad(temporaryHome())
    folder.writeThread(aThread({}))

    expect(readdirSync(join(folder.path, 'threads'))).toStrictEqual(['c-1.json'])
  })

  it('reads one thread by its id', () => {
    const folder = exportJobScratchPad(temporaryHome())
    folder.writeThread(aThread({ id: 'c-3' }))

    expect(folder.readThread('c-3')).toStrictEqual(aThread({ id: 'c-3' }))
  })

  it('throws UnknownThreadError when the thread does not exist', () => {
    const folder = exportJobScratchPad(temporaryHome())
    expect(() => folder.readThread('c-9')).toThrow(UnknownThreadError)
    expect(() => folder.readThread('c-9')).toThrow(
      "There isn't any thread called c-9 in 2026-03-14-export-job.",
    )
  })

  it('recommends the inbox of the type of the id when the thread does not exist', () => {
    const folder = exportJobScratchPad(temporaryHome())
    expect(() => folder.readThread('g-2')).toThrow(
      'Run "scratch-pad inbox --all --type grammar" to list the threads that wait for the agent.',
    )
  })

  it('throws InvalidItemIdError before it builds a path from an invalid id', () => {
    const folder = exportJobScratchPad(temporaryHome())
    const read = () => folder.readThread('../progress-tracker')

    expect(read).toThrow(InvalidItemIdError)
    expect(read).toThrow(`"../progress-tracker" isn't an id.`)
  })

  it('returns no threads when the threads folder is missing', () => {
    const folder = exportJobScratchPad(temporaryHome())
    expect(new ScratchPadFolder(join(folder.path, 'missing')).readThreads()).toStrictEqual([])
  })

  it('reads back the decision answers it wrote', () => {
    const folder = exportJobScratchPad(temporaryHome())
    folder.writeDecisionAnswer(aDecisionAnswer({}))

    expect(folder.readDecisionAnswers()).toStrictEqual([aDecisionAnswer({})])
  })

  it('reads one decision answer by its id', () => {
    const folder = exportJobScratchPad(temporaryHome())
    folder.writeDecisionAnswer(aDecisionAnswer({ id: 'd-2' }))

    expect(folder.readDecisionAnswer('d-2').id).toBe('d-2')
  })

  it('throws UnknownDecisionError when the decision answer does not exist', () => {
    const folder = exportJobScratchPad(temporaryHome())
    expect(() => folder.readDecisionAnswer('d-4')).toThrow(UnknownDecisionError)
    expect(() => folder.readDecisionAnswer('d-4')).toThrow(
      "There isn't any answered decision called d-4 in 2026-03-14-export-job.",
    )
  })

  it('reads back the events it appended in their order', () => {
    const folder = exportJobScratchPad(temporaryHome())
    folder.appendEvent(goalSet)
    folder.appendEvent(threadOpened)

    expect(folder.readEvents()).toStrictEqual([goalSet, threadOpened])
  })

  it('appends each event as one line of JSON', () => {
    const folder = exportJobScratchPad(temporaryHome())
    folder.appendEvent({ ...threadOpened, number: 1 })

    expect(readFileSync(join(folder.path, 'events.jsonl'), 'utf8')).toBe(
      `{"number":1,"time":"${time}","kind":"thread-opened","by":"nick","item":"c-1"}\n`,
    )
  })

  it('starts the event on a new line when the events file does not end with a newline', () => {
    const folder = exportJobScratchPad(temporaryHome())
    writeFileInPad(folder, 'events.jsonl', JSON.stringify(goalSet))

    folder.appendEvent(threadOpened)

    expect(folder.readEvents()).toStrictEqual([goalSet, threadOpened])
  })

  it('names the line of a broken event in the error', () => {
    const folder = exportJobScratchPad(temporaryHome())
    writeFileInPad(folder, 'events.jsonl', '\n{"number":1}\n')

    expect(() => folder.readEvents()).toThrow(BrokenFileError)
    expect(() => folder.readEvents()).toThrow(
      'events.jsonl line 2 is broken: "time" must be a text',
    )
  })

  it('writes the decision log as one line of JSON per entry', () => {
    const folder = exportJobScratchPad(temporaryHome())
    folder.writeDecisionLog([
      { number: 1, time, source: 'chat', text: 'Keep 5 retries.', decision: undefined },
      { number: 2, time, source: 'page', text: 'Show the tax number.', decision: 'd-1' },
    ])

    expect(readFileSync(join(folder.path, 'decision-log.jsonl'), 'utf8')).toBe(
      [
        `{"number":1,"time":"${time}","source":"chat","text":"Keep 5 retries."}`,
        `{"number":2,"time":"${time}","source":"page","text":"Show the tax number.","decision":"d-1"}`,
        '',
      ].join('\n'),
    )
  })

  it('reads back the decision log it wrote', () => {
    const folder = exportJobScratchPad(temporaryHome())
    const log = [
      { number: 1, time, source: 'page', text: 'Show the tax number.', decision: 'd-1' },
    ] as const
    folder.writeDecisionLog(log)

    expect(folder.readDecisionLog()).toStrictEqual(log)
  })

  it('reads back the last printed events it wrote', () => {
    const folder = exportJobScratchPad(temporaryHome())
    const lastPrinted = { ...nothingPrinted, comment: 7 }
    folder.writeLastPrintedEvents(lastPrinted)

    expect(folder.readLastPrintedEvents()).toStrictEqual(lastPrinted)
  })

  it('reads nothing printed when the agent inbox file is missing', () => {
    const folder = exportJobScratchPad(temporaryHome())
    expect(
      new ScratchPadFolder(join(folder.path, 'missing')).readLastPrintedEvents(),
    ).toStrictEqual(nothingPrinted)
  })

  it('lists the Markdown files in the pages folder', () => {
    const folder = exportJobScratchPad(temporaryHome())
    ;['retry.md', 'audit.md', 'notes.txt'].forEach((file) =>
      writeFileInPad(folder, `pages/${file}`, '# x'),
    )

    expect(folder.pages().toSorted((first, second) => first.localeCompare(second))).toStrictEqual([
      'pages/audit.md',
      'pages/index.md',
      'pages/retry.md',
    ])
  })

  it('reads the lines of a page', () => {
    const folder = exportJobScratchPad(temporaryHome())
    expect(folder.readPageLines('pages/index.md')).toStrictEqual(exportJobIndexPage.split('\n'))
  })

  it('reads no lines when the page does not exist', () => {
    const folder = exportJobScratchPad(temporaryHome())
    expect(folder.readPageLines('pages/missing.md')).toStrictEqual([])
  })

  it('reads no lines when the path is outside the pages folder', () => {
    const folder = exportJobScratchPad(temporaryHome())
    expect(folder.readPageLines('progress-tracker.json')).toStrictEqual([])
  })

  it('creates the folder of a file when the folder is missing', () => {
    const folder = exportJobScratchPad(temporaryHome())
    mkdirSync(join(folder.path, 'empty'))
    const bare = new ScratchPadFolder(join(folder.path, 'empty'))
    bare.writeThread(aThread({}))

    expect(existsSync(join(bare.path, 'threads', 'c-1.json'))).toBe(true)
  })

  it('ignores files that are not JSON in the threads folder', () => {
    const folder = exportJobScratchPad(temporaryHome())
    writeFileSync(join(folder.path, 'threads', 'notes.txt'), 'x')

    expect(folder.readThreads()).toStrictEqual([])
  })
})

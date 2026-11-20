import { PassThrough, Readable } from 'node:stream'
import { afterEach, describe, expect, it } from 'vitest'
import { nickAnswersDecision, nickComments } from '../nick-actions/nick-actions'
import {
  exportJobScratchPad,
  removeTemporaryHomes,
  temporaryHome,
} from './scratch-pad-folder-fixtures'
import { type ScratchPadFolder } from './scratch-pad-folder'
import {
  WriterArgumentsError,
  runWriter,
  runWriterProcess,
  type WriterName,
} from './two-processes-writers'

const later = () => Date.now() + 10_000

afterEach(() => {
  removeTemporaryHomes()
})

function commentOnExportJob(folder: ScratchPadFolder, text: string): void {
  nickComments(folder, {
    type: 'comment',
    page: 'index',
    anchor: { firstLine: 1, lastLine: 1, selectedText: 'Export job' },
    text,
  })
}

function answer(folder: ScratchPadFolder, question: string, choice: string): void {
  nickAnswersDecision(folder, { page: 'index', line: 3, question, answer: { choice } })
}

function run(writer: WriterName, folder: ScratchPadFolder, count: number, deadline = later()) {
  const printed: string[] = []
  runWriter(writer, { folder, count, deadline, print: (line) => printed.push(line) })
  return printed
}

describe('runWriterProcess', () => {
  it('throws WriterArgumentsError when the writer is unknown', async () => {
    const start = runWriterProcess(['agent-sleeps', '/pads', '2'], Readable.from([]), () => {})

    await expect(start).rejects.toThrow(WriterArgumentsError)
    await expect(start).rejects.toThrow(
      '"agent-sleeps /pads 2" isn\'t a writer run. Pass the writer, the path of the scratch pad and the count.',
    )
  })

  it.each([[['agent-adds-tasks']], [['agent-adds-tasks', '/pads']]])(
    'throws WriterArgumentsError when the arguments are %j',
    async (args) => {
      await expect(runWriterProcess(args, Readable.from([]), () => {})).rejects.toThrow(
        WriterArgumentsError,
      )
    },
  )

  it('prints ready and waits for the go line when it has started', async () => {
    const folder = exportJobScratchPad(temporaryHome())
    const go = new PassThrough()
    const printed: string[] = []
    const finished = runWriterProcess(['agent-adds-tasks', folder.path, '2'], go, (line) =>
      printed.push(line),
    )

    expect(printed).toStrictEqual(['ready'])
    expect(folder.read((pad) => pad.readProgressTracker().tasks)).toStrictEqual([])

    go.end('go\n')
    await finished

    expect(
      folder.read((pad) => pad.readProgressTracker().tasks.map((task) => task.title)),
    ).toStrictEqual(['Export batch 1', 'Export batch 2'])
  })
})

describe('runWriter', () => {
  it('adds the numbered tasks when the agent adds tasks', () => {
    const folder = exportJobScratchPad(temporaryHome())
    run('agent-adds-tasks', folder, 2)

    expect(
      folder.read((pad) => pad.readProgressTracker().tasks.map((task) => task.title)),
    ).toStrictEqual(['Export batch 1', 'Export batch 2'])
  })

  it('adds the numbered comments when Nick comments', () => {
    const folder = exportJobScratchPad(temporaryHome())
    run('nick-comments', folder, 2)

    expect(
      folder.read((pad) => pad.readThreads().map((thread) => thread.messages[0].text)),
    ).toStrictEqual(['Check batch 1', 'Check batch 2'])
  })

  it.each([
    ['agent-replies', 'Agent reply'],
    ['nick-replies', 'Nick reply'],
  ] as const)('adds the numbered replies to c-1 when the writer is %s', (writer, reply) => {
    const folder = exportJobScratchPad(temporaryHome())
    commentOnExportJob(folder, 'Why 5 retries?')
    run(writer, folder, 2)

    expect(
      folder.read((pad) => pad.readThread('c-1').messages.map((message) => message.text)),
    ).toStrictEqual(['Why 5 retries?', `${reply} 1`, `${reply} 2`])
  })

  it('saves the second answer of each decision when Nick answers twice', () => {
    const folder = exportJobScratchPad(temporaryHome())
    run('nick-answers-twice', folder, 2)

    expect(
      folder.read((pad) => pad.readDecisionAnswers().map((decision) => decision.answer)),
    ).toStrictEqual([{ choice: 'second' }, { choice: 'second' }])
  })

  it('prints the id of each new comment when the agent reads its inbox', () => {
    const folder = exportJobScratchPad(temporaryHome())
    commentOnExportJob(folder, 'Check batch 1')
    commentOnExportJob(folder, 'Check batch 2')

    expect(run('agent-reads-inbox', folder, 2)).toStrictEqual(['c-1', 'c-2'])
  })

  it('prints nothing when the deadline has passed before the agent reads its inbox', () => {
    const folder = exportJobScratchPad(temporaryHome())
    commentOnExportJob(folder, 'Check batch 1')

    expect(run('agent-reads-inbox', folder, 1, Date.now())).toStrictEqual([])
  })

  it('prints only the decisions whose answer is second when the agent reads decisions', () => {
    const folder = exportJobScratchPad(temporaryHome())
    answer(folder, 'Retry batch 1?', 'second')
    answer(folder, 'Retry batch 2?', 'first')

    expect(run('agent-reads-decisions', folder, 1)).toStrictEqual(['d-1: second'])
  })
})

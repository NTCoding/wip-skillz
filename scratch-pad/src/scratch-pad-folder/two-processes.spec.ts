import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { nickComments } from '../nick-actions/nick-actions'
import {
  exportJobScratchPad,
  removeTemporaryHomes,
  temporaryHome,
} from './scratch-pad-folder-fixtures'
import { inTextOrder, numbered, runTwoWriters, type WriterOutput } from './two-processes-fixtures'

const count = 200
const timeout = 30_000
const finishedWithoutErrors = [
  { exitCode: 0, errors: '' },
  { exitCode: 0, errors: '' },
]

afterAll(() => {
  removeTemporaryHomes()
})

function exitsOf(outputs: readonly WriterOutput[]) {
  return outputs.map((output) => ({ exitCode: output.exitCode, errors: output.errors }))
}

describe('two processes that add tasks and comments at the same time', () => {
  const folder = exportJobScratchPad(temporaryHome())
  const outputs: WriterOutput[] = []

  beforeAll(async () => {
    outputs.push(
      ...(await runTwoWriters(
        folder,
        { writer: 'agent-adds-tasks', count },
        { writer: 'nick-comments', count },
      )),
    )
  }, timeout)

  it('lets both writers finish without an error when the agent adds tasks while Nick writes comments', () => {
    expect(exitsOf(outputs)).toStrictEqual(finishedWithoutErrors)
  })

  it('keeps every task that the agent added when Nick writes comments at the same time', () => {
    expect(
      folder.read((pad) => pad.readProgressTracker().tasks.map((task) => task.title)),
    ).toStrictEqual(numbered('Export batch ', count))
  })

  it('keeps every comment that Nick wrote when the agent adds tasks at the same time', () => {
    expect(folder.read((pad) => pad.readThreads().map((thread) => thread.id))).toStrictEqual(
      numbered('c-', count),
    )
  })

  it('gives every event its own number when 2 processes append events at the same time', () => {
    expect(folder.read((pad) => pad.readEvents().map((event) => event.number))).toStrictEqual(
      Array.from({ length: 2 * count }, (_, index) => index + 1),
    )
  })
})

describe('two processes that read the inbox and add comments at the same time', () => {
  const folder = exportJobScratchPad(temporaryHome())
  const outputs: WriterOutput[] = []

  beforeAll(async () => {
    outputs.push(
      ...(await runTwoWriters(
        folder,
        { writer: 'agent-reads-inbox', count },
        { writer: 'nick-comments', count },
      )),
    )
  }, timeout)

  it('lets both writers finish without an error when the agent reads its inbox while Nick writes comments', () => {
    expect(exitsOf(outputs)).toStrictEqual(finishedWithoutErrors)
  })

  it('prints every comment to the agent exactly once when Nick writes comments while the agent reads', () => {
    expect(inTextOrder(outputs[0]?.lines ?? [])).toStrictEqual(inTextOrder(numbered('c-', count)))
  })
})

describe('two processes that reply to the same comment at the same time', () => {
  const folder = exportJobScratchPad(temporaryHome())
  const outputs: WriterOutput[] = []

  beforeAll(async () => {
    nickComments(folder, {
      type: 'comment',
      page: 'index',
      anchor: { firstLine: 1, lastLine: 1, selectedText: 'Export job' },
      text: 'Why 5 retries?',
    })
    outputs.push(
      ...(await runTwoWriters(
        folder,
        { writer: 'agent-replies', count },
        { writer: 'nick-replies', count },
      )),
    )
  }, timeout)

  it('lets both writers finish without an error when the agent and Nick reply to c-1 at the same time', () => {
    expect(exitsOf(outputs)).toStrictEqual(finishedWithoutErrors)
  })

  it('keeps every reply of both when the agent and Nick reply to c-1 at the same time', () => {
    expect(
      inTextOrder(
        folder.read((pad) => pad.readThread('c-1').messages.map((message) => message.text)),
      ),
    ).toStrictEqual(
      inTextOrder([
        'Why 5 retries?',
        ...numbered('Agent reply ', count),
        ...numbered('Nick reply ', count),
      ]),
    )
  })
})

describe('two processes that read the inbox and change answers at the same time', () => {
  const folder = exportJobScratchPad(temporaryHome())
  const decisions = 100
  const outputs: WriterOutput[] = []

  beforeAll(async () => {
    outputs.push(
      ...(await runTwoWriters(
        folder,
        { writer: 'agent-reads-decisions', count: decisions },
        { writer: 'nick-answers-twice', count: decisions },
      )),
    )
  }, timeout)

  it('lets both writers finish without an error when the agent reads its inbox while Nick changes his answers', () => {
    expect(exitsOf(outputs)).toStrictEqual(finishedWithoutErrors)
  })

  it('keeps the second answer of every decision when the agent reads its inbox at the same time', () => {
    expect(
      folder.read((pad) => pad.readDecisionAnswers().map((decision) => decision.answer)),
    ).toStrictEqual(Array.from({ length: decisions }, () => ({ choice: 'second' })))
  })

  it('prints the second answer of every decision to the agent exactly once when Nick changes his answers while the agent reads', () => {
    expect(
      inTextOrder(outputs[0]?.lines.filter((line) => line.endsWith(': second')) ?? []),
    ).toStrictEqual(inTextOrder(numbered('d-', decisions).map((id) => `${id}: second`)))
  })
})

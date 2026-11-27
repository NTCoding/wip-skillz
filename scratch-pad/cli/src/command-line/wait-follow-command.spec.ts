import { afterEach, describe, expect, it } from 'vitest'
import { commentAndGrammarNoteAndDecision } from '../agent-commands/agent-commands-fixtures'
import {
  freezeClockAt,
  removeTemporaryHomes,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { runCommandLine } from './command-line'
import { environmentWithScratchPad, runScratchPad } from './command-line-fixtures'

afterEach(() => {
  removeTemporaryHomes()
})

describe('wait --follow', () => {
  freezeClockAt('2026-03-14T09:30:00.000Z')

  it('wait --follow writes each batch of new items separately and exits with 0 when it is stopped', async () => {
    const environment = environmentWithScratchPad(commentAndGrammarNoteAndDecision)
    const stopping = new AbortController()
    const writes: string[] = []
    setTimeout(() => stopping.abort(), 400)

    const exitCode = await runCommandLine({
      argv: ['wait', '--follow', '--quiet', '0'],
      environment,
      stdout: { write: (text: string) => writes.push(text) },
      stderr: { write: () => true },
      readStandardInput: () => Promise.resolve(''),
      toolCommand: [process.execPath],
      stopSignal: stopping.signal,
    })

    expect(exitCode).toBe(0)
    expect(writes).toHaveLength(1)
    expect(writes[0]).toMatch(/^2 new items in 2026-03-14-export-job\n/)
  })

  it('wait --follow prints nothing when it is stopped before a new item arrives', async () => {
    const stopping = new AbortController()
    const writes: string[] = []
    setTimeout(() => stopping.abort(), 50)

    const exitCode = await runCommandLine({
      argv: ['wait', '--follow'],
      environment: environmentWithScratchPad(),
      stdout: { write: (text: string) => writes.push(text) },
      stderr: { write: () => true },
      readStandardInput: () => Promise.resolve(''),
      toolCommand: [process.execPath],
      stopSignal: stopping.signal,
    })

    expect(exitCode).toBe(0)
    expect(writes).toStrictEqual([])
  })

  it('wait prints an error when --follow and --timeout are both given', async () => {
    expect(
      (await runScratchPad(['wait', '--follow', '--timeout', '5'], environmentWithScratchPad()))
        .stderr,
    ).toBe(
      'Pass either --follow or --timeout. Usage: scratch-pad wait [--follow] [--quiet <seconds>] [--timeout <seconds>]\n',
    )
  })
})

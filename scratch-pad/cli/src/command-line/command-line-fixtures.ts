import {
  exportJobScratchPad,
  temporaryHome,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { type Environment } from '../scratch-pads-home/scratch-pads-home'
import { type ToolCommand } from '../server-process/server-process'
import { runCommandLine } from './command-line'

interface CommandLineResult {
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
}

interface ProcessSetUp {
  readonly readStandardInput: () => Promise<string>
  readonly toolCommand: ToolCommand
  readonly stopSignal: AbortSignal
}

type ScratchPadEnvironment = Environment & {
  readonly SCRATCH_PADS_HOME: string
  readonly SCRATCH_PAD: string
}

export const waitReminderText = 'Run `wait` in the background before you end your turn.'

const noProcessSetUp: ProcessSetUp = {
  readStandardInput: () => Promise.resolve(''),
  toolCommand: [process.execPath, '--eval', 'process.exit(9)'],
  stopSignal: new AbortController().signal,
}

export async function runScratchPad(
  argv: readonly string[],
  environment: Environment,
  setUp: Partial<ProcessSetUp> = {},
): Promise<CommandLineResult> {
  const stdout: string[] = []
  const stderr: string[] = []
  const exitCode = await runCommandLine({
    argv,
    environment,
    stdout: { write: (text: string) => stdout.push(text) },
    stderr: { write: (text: string) => stderr.push(text) },
    ...noProcessSetUp,
    ...setUp,
  })
  return { exitCode, stdout: stdout.join(''), stderr: stderr.join('') }
}

export function environmentWithScratchPad(
  addItems: (folder: ScratchPadFolder) => void = () => undefined,
): ScratchPadEnvironment {
  const home = temporaryHome()
  const folder = exportJobScratchPad(home)
  addItems(folder)
  return { SCRATCH_PADS_HOME: home, SCRATCH_PAD: folder.name }
}

import {
  exportJobScratchPad,
  temporaryHome,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { type Environment } from '../scratch-pads-home/scratch-pads-home'
import { runCommandLine } from './command-line'

interface CommandLineResult {
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
}

type ScratchPadEnvironment = Environment & {
  readonly SCRATCH_PADS_HOME: string
  readonly SCRATCH_PAD: string
}

export function runScratchPad(
  argv: readonly string[],
  environment: Environment,
): CommandLineResult {
  const stdout: string[] = []
  const stderr: string[] = []
  const exitCode = runCommandLine({
    argv,
    environment,
    stdout: { write: (text: string) => stdout.push(text) },
    stderr: { write: (text: string) => stderr.push(text) },
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

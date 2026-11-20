import { spawnSync } from 'node:child_process'
import { ScratchPadError } from '../scratch-pad-error'

export type ProseCheck = (pagePath: string) => readonly string[]

export class ProseCheckError extends ScratchPadError {
  constructor(executable: string, reason: string) {
    super(
      `SCRATCH_PAD_PROSE_CHECK is ${executable}, which can't be run (${reason}). Point it at an executable or unset it.`,
    )
  }
}

export function proseCheckFrom(executable: string | undefined): ProseCheck | undefined {
  if (executable === undefined || executable === '') {
    return undefined
  }
  return (pagePath) => {
    const result = spawnSync(executable, [pagePath], { encoding: 'utf8' })
    if (result.error !== undefined) {
      throw new ProseCheckError(executable, result.error.message)
    }
    return result.stdout
      .split('\n')
      .map((line) => line.trimEnd())
      .filter((line) => line.trim() !== '')
  }
}

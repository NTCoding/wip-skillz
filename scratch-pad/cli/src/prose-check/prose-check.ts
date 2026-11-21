import { spawnSync, type SpawnSyncReturns } from 'node:child_process'
import { ScratchPadError } from '../scratch-pad-error'

export type ProseCheck = (pagePath: string, pageText: string) => readonly string[]

export class ProseCheckError extends ScratchPadError {
  constructor(executable: string, reason: string) {
    super(
      `SCRATCH_PAD_PROSE_CHECK is ${executable}, which can't be run (${reason}). Point it at an executable or unset it.`,
    )
  }
}

export class FailedProseCheckError extends ScratchPadError {
  constructor(executable: string, pagePath: string, reason: string) {
    super(
      `The prose check ${executable} failed on ${pagePath}: ${reason}. Fix the prose check or unset SCRATCH_PAD_PROSE_CHECK.`,
    )
  }
}

export function proseCheckFrom(executable: string | undefined): ProseCheck | undefined {
  if (executable === undefined || executable === '') {
    return undefined
  }
  return (pagePath, pageText) => {
    const result = spawnSync(executable, [pagePath], { encoding: 'utf8', input: pageText })
    if (result.error !== undefined && !isBrokenPipe(result.error)) {
      throw new ProseCheckError(executable, result.error.message)
    }
    const failure = failureOf(result)
    if (failure !== undefined) {
      throw new FailedProseCheckError(executable, pagePath, failure)
    }
    return nonBlankLines(result.stdout)
  }
}

function isBrokenPipe(error: Error): boolean {
  return 'code' in error && error.code === 'EPIPE'
}

function failureOf(result: SpawnSyncReturns<string>): string | undefined {
  if (result.signal !== null) {
    return `it was stopped by ${result.signal}`
  }
  if (nonBlankLines(result.stdout).length > 0) {
    return undefined
  }
  const errors = nonBlankLines(result.stderr).join(' ')
  if (errors !== '') {
    return `it exited with ${result.status} and only wrote to stderr: ${errors}`
  }
  return result.status === 0
    ? undefined
    : `it exited with ${result.status} without printing anything`
}

function nonBlankLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== '')
}

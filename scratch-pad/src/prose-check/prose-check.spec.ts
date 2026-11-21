import { chmodSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  removeTemporaryHomes,
  temporaryHome,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { FailedProseCheckError, ProseCheckError, proseCheckFrom } from './prose-check'

afterEach(() => {
  removeTemporaryHomes()
})

function proseCheckScript(lines: readonly string[]): string {
  const path = join(temporaryHome(), 'prose-check.sh')
  writeFileSync(path, ['#!/bin/sh', ...lines].join('\n'))
  chmodSync(path, 0o755)
  return path
}

const pagePath = '/pads/pages/invoice.md'
const pageText = ['# Invoice export', '', 'The export job retries 5 times.'].join('\n')

describe('proseCheckFrom', () => {
  it.each([undefined, ''])('returns no prose check when the variable is %j', (executable) => {
    expect(proseCheckFrom(executable)).toBeUndefined()
  })

  it('returns each line that the executable prints for the page when the executable exits with 1', () => {
    const executable = proseCheckScript([
      'echo "line 3: $1 has a long sentence"',
      'echo ""',
      'echo "line 9: the sentence ends with it   "',
      'exit 1',
    ])

    expect(proseCheckFrom(executable)?.(pagePath, pageText)).toStrictEqual([
      'line 3: /pads/pages/invoice.md has a long sentence',
      'line 9: the sentence ends with it',
    ])
  })

  it("throws ProseCheckError when the executable doesn't exist", () => {
    const executable = join(temporaryHome(), 'missing.sh')
    const check = () => proseCheckFrom(executable)?.(pagePath, pageText)

    expect(check).toThrow(ProseCheckError)
    expect(check).toThrow(
      `SCRATCH_PAD_PROSE_CHECK is ${executable}, which can't be run (spawnSync ${executable} ENOENT). Point it at an executable or unset it.`,
    )
  })
  it('returns the problems that the executable finds when the executable reads the page on stdin', () => {
    const executable = proseCheckScript(["grep -n 'retries' | sed 's/^/line /'"])

    expect(proseCheckFrom(executable)?.(pagePath, pageText)).toStrictEqual([
      'line 3:The export job retries 5 times.',
    ])
  })

  it("returns the problems that the executable finds when the executable doesn't read a long page on stdin", () => {
    const executable = proseCheckScript(['echo "line 1: $1 is too long"'])
    const longPage = 'The export job retries 5 times.\n'.repeat(10_000)

    expect(proseCheckFrom(executable)?.(pagePath, longPage)).toStrictEqual([
      `line 1: ${pagePath} is too long`,
    ])
  })

  it("returns an empty list when the executable exits with 0 and doesn't print anything", () => {
    expect(proseCheckFrom(proseCheckScript(['exit 0']))?.(pagePath, pageText)).toStrictEqual([])
  })

  it('throws FailedProseCheckError when the executable is killed by a signal', () => {
    const executable = proseCheckScript(['echo "line 3: a long sentence"', 'kill -9 $$'])
    const check = () => proseCheckFrom(executable)?.(pagePath, pageText)

    expect(check).toThrow(FailedProseCheckError)
    expect(check).toThrow(
      `The prose check ${executable} failed on ${pagePath}: it was stopped by SIGKILL. Fix the prose check or unset SCRATCH_PAD_PROSE_CHECK.`,
    )
  })

  it("throws FailedProseCheckError when the executable exits with an error and doesn't print anything", () => {
    const executable = proseCheckScript(['exit 2'])
    const check = () => proseCheckFrom(executable)?.(pagePath, pageText)

    expect(check).toThrow(FailedProseCheckError)
    expect(check).toThrow(
      `The prose check ${executable} failed on ${pagePath}: it exited with 2 without printing anything. Fix the prose check or unset SCRATCH_PAD_PROSE_CHECK.`,
    )
  })

  it('throws FailedProseCheckError when the executable only writes to stderr', () => {
    const executable = proseCheckScript(['echo "the list of rules is missing" >&2'])
    const check = () => proseCheckFrom(executable)?.(pagePath, pageText)

    expect(check).toThrow(FailedProseCheckError)
    expect(check).toThrow(
      `The prose check ${executable} failed on ${pagePath}: it exited with 0 and only wrote to stderr: the list of rules is missing. Fix the prose check or unset SCRATCH_PAD_PROSE_CHECK.`,
    )
  })
})

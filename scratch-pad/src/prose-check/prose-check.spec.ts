import { chmodSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  removeTemporaryHomes,
  temporaryHome,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { ProseCheckError, proseCheckFrom } from './prose-check'

afterEach(() => {
  removeTemporaryHomes()
})

function proseCheckScript(lines: readonly string[]): string {
  const path = join(temporaryHome(), 'prose-check.sh')
  writeFileSync(path, ['#!/bin/sh', ...lines].join('\n'))
  chmodSync(path, 0o755)
  return path
}

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

    expect(proseCheckFrom(executable)?.('/pads/pages/invoice.md')).toStrictEqual([
      'line 3: /pads/pages/invoice.md has a long sentence',
      'line 9: the sentence ends with it',
    ])
  })

  it("throws ProseCheckError when the executable doesn't exist", () => {
    const executable = join(temporaryHome(), 'missing.sh')
    const check = () => proseCheckFrom(executable)?.('/pads/pages/invoice.md')

    expect(check).toThrow(ProseCheckError)
    expect(check).toThrow(
      `SCRATCH_PAD_PROSE_CHECK is ${executable}, which can't be run (spawnSync ${executable} ENOENT). Point it at an executable or unset it.`,
    )
  })
})

import { rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  exportJobScratchPad,
  removeTemporaryHomes,
  temporaryHome,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { nickComments } from '../nick-actions/nick-actions'
import { ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { retryAnchor } from '../threads/thread-fixtures'
import { helpText, runCommandLine } from './command-line'
import { environmentWithScratchPad, runScratchPad } from './command-line-fixtures'

class ClosedStreamError extends Error {}

afterEach(() => {
  removeTemporaryHomes()
})

function commentOnRetryPolicy(folder: ScratchPadFolder): void {
  nickComments(folder, {
    type: 'comment',
    page: 'pages/index.md',
    anchor: retryAnchor,
    text: 'Is 5 retries enough?',
  })
}

function lastMessageOfComment(environment: ReturnType<typeof environmentWithScratchPad>) {
  return new ScratchPadFolder(join(environment.SCRATCH_PADS_HOME, environment.SCRATCH_PAD))
    .readThread('c-1')
    .messages.at(-1)?.text
}

describe('runCommandLine', () => {
  it('writes the output of the command and returns 0 when the command succeeds', () => {
    expect(
      runScratchPad(['task', 'add', 'Write', 'the retry policy'], environmentWithScratchPad()),
    ).toStrictEqual({
      exitCode: 0,
      stdout: 'task 1 added: Write the retry policy\n',
      stderr: '',
    })
  })

  it.each([[[]], [['help']], [['status', '--help']]])(
    'prints the help when the words are %j',
    (argv) => {
      expect(runScratchPad(argv, {}).stdout).toBe(`${helpText()}\n`)
    },
  )

  it('writes the error to the error stream and returns 1 when the command fails', () => {
    expect(runScratchPad(['show', 'c-9'], environmentWithScratchPad())).toStrictEqual({
      exitCode: 1,
      stdout: '',
      stderr:
        'There isn\'t any thread called c-9 in 2026-03-14-export-job. Run "scratch-pad inbox --all --type comment" to list the threads that wait for the agent.\n',
    })
  })

  it('returns 1 when the command is unknown', () => {
    expect(runScratchPad(['start'], {})).toStrictEqual({
      exitCode: 1,
      stdout: '',
      stderr: '"start" isn\'t a command. Run "scratch-pad help" to list the commands.\n',
    })
  })

  it('names both words when a task command is unknown', () => {
    expect(runScratchPad(['task', 'remove', '3'], {}).stderr).toBe(
      '"task remove" isn\'t a command. Run "scratch-pad help" to list the commands.\n',
    )
  })

  it('returns 1 when an option does not work with the command', () => {
    expect(runScratchPad(['status', '--all'], {})).toStrictEqual({
      exitCode: 1,
      stdout: '',
      stderr: "--all doesn't work with this command. Usage: scratch-pad status\n",
    })
  })

  it('saves a reply that starts with a dash', () => {
    const environment = environmentWithScratchPad(commentOnRetryPolicy)
    runScratchPad(['reply', 'c-1', '- I changed the limit to 7'], environment)

    expect(lastMessageOfComment(environment)).toBe('- I changed the limit to 7')
  })

  it('saves a reply that contains --help instead of printing the help', () => {
    const environment = environmentWithScratchPad(commentOnRetryPolicy)
    runScratchPad(['reply', 'c-1', 'Run the export job with', '--help'], environment)

    expect(lastMessageOfComment(environment)).toBe('Run the export job with --help')
  })

  it('takes the scratch pad from --pad before SCRATCH_PAD', () => {
    const environment = environmentWithScratchPad()
    const other = exportJobScratchPad(temporaryHome())

    expect(runScratchPad(['status', '--pad', other.path], environment).stdout).toContain(other.path)
  })

  it('lists the scratch pads when no scratch pad is selected', () => {
    const { SCRATCH_PADS_HOME } = environmentWithScratchPad()

    expect(runScratchPad(['status'], { SCRATCH_PADS_HOME }).stderr).toBe(
      `No scratch pad is selected. Pass --pad <folder> or set SCRATCH_PAD.\nThe scratch pads in ${SCRATCH_PADS_HOME} are: 2026-03-14-export-job\n`,
    )
  })

  it('prints the message of a file system error and returns 1', () => {
    const environment = environmentWithScratchPad()
    const threads = join(environment.SCRATCH_PADS_HOME, environment.SCRATCH_PAD, 'threads')
    rmSync(threads, { recursive: true })
    writeFileSync(threads, '')

    expect(runScratchPad(['status'], environment)).toStrictEqual({
      exitCode: 1,
      stdout: '',
      stderr: `ENOTDIR: not a directory, scandir '${threads}'\n`,
    })
  })

  it('throws an error that is neither a scratch pad error nor a file system error', () => {
    const run = () =>
      runCommandLine({
        argv: ['help'],
        environment: {},
        stdout: {
          write: () => {
            throw new ClosedStreamError('the output stream is closed')
          },
        },
        stderr: { write: () => true },
      })

    expect(run).toThrow(ClosedStreamError)
    expect(run).toThrow('the output stream is closed')
  })
})

describe('helpText', () => {
  it('lists every command with its summary', () => {
    expect(helpText().split('\n').slice(0, 4)).toStrictEqual([
      'usage: scratch-pad <command> [--pad <folder>]',
      '',
      '  new <topic>                     create a scratch pad with an index page and a progress tracker',
      '  status                          print the current task and what waits for the agent and for Nick',
    ])
  })
})

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
    .read((pad) => pad.readThread('c-1'))
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

  it('saves a reply and exits with 0 when the text starts with --help', () => {
    const environment = environmentWithScratchPad(commentOnRetryPolicy)

    expect(
      runScratchPad(['reply', 'c-1', '--help', 'prints', 'the', 'usage'], environment),
    ).toStrictEqual({ exitCode: 0, stdout: 'c-1 now waits for Nick\n', stderr: '' })
    expect(lastMessageOfComment(environment)).toBe('--help prints the usage')
  })

  it('prints the help when --help is the last word after the id', () => {
    const environment = environmentWithScratchPad(commentOnRetryPolicy)

    expect(runScratchPad(['reply', 'c-1', '--help'], environment).stdout).toBe(`${helpText()}\n`)
  })

  it('prints the status of the scratch pad of --pad when SCRATCH_PAD names another one', () => {
    const environment = environmentWithScratchPad()
    const other = exportJobScratchPad(temporaryHome())

    expect(runScratchPad(['status', '--pad', other.path], environment).stdout).toBe(
      [
        `2026-03-14-export-job · ${other.path}`,
        'no tasks yet',
        'waiting for the agent: nothing',
        'waiting for Nick: nothing',
        '',
      ].join('\n'),
    )
  })

  it('lists the scratch pads when no scratch pad is selected', () => {
    const { SCRATCH_PADS_HOME } = environmentWithScratchPad()

    expect(runScratchPad(['status'], { SCRATCH_PADS_HOME }).stderr).toBe(
      `No scratch pad is selected. Pass --pad <folder> or set SCRATCH_PAD.\nThe scratch pads in ${SCRATCH_PADS_HOME} are: 2026-03-14-export-job\n`,
    )
  })

  it('prints the message of a file system error and returns 1', () => {
    const environment = environmentWithScratchPad()
    const pages = join(environment.SCRATCH_PADS_HOME, environment.SCRATCH_PAD, 'pages')
    rmSync(pages, { recursive: true })
    writeFileSync(pages, '')

    expect(runScratchPad(['pages'], environment)).toStrictEqual({
      exitCode: 1,
      stdout: '',
      stderr: `ENOTDIR: not a directory, scandir '${pages}'\n`,
    })
  })

  it('prints that pad.db is broken without telling the agent to delete anything when pad.db is not a database', () => {
    const environment = environmentWithScratchPad()
    const padDb = join(environment.SCRATCH_PADS_HOME, environment.SCRATCH_PAD, 'pad.db')
    writeFileSync(padDb, 'The export job retries 5 times.\n'.repeat(40))

    expect(runScratchPad(['inbox'], environment)).toStrictEqual({
      exitCode: 1,
      stdout: '',
      stderr:
        'pad.db in 2026-03-14-export-job is broken: file is not a database. Nothing was saved. Tell Nick, because the threads, the decisions and the progress tracker of the scratch pad are in pad.db.\n',
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

import { afterEach, describe, expect, it } from 'vitest'
import { commentAndGrammarNoteAndDecision } from '../agent-commands/agent-commands-fixtures'
import { join } from 'node:path'
import {
  freezeClockAt,
  removeTemporaryHomes,
  temporaryHome,
  writeFileInPad,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { type Environment } from '../scratch-pads-home/scratch-pads-home'
import { environmentWithScratchPad, runScratchPad } from './command-line-fixtures'

freezeClockAt('2026-03-14T09:30:00.000Z')

afterEach(() => {
  removeTemporaryHomes()
})

function environmentWithItems() {
  return environmentWithScratchPad(commentAndGrammarNoteAndDecision)
}

function environmentWithBrokenLink() {
  return environmentWithScratchPad((folder) => {
    writeFileInPad(folder, 'pages/retry.md', '# Retry\n\nSee [the queue](queue.md).\n')
  })
}

function output(
  argv: readonly string[],
  environment: Environment = environmentWithItems(),
): string {
  const result = runScratchPad(argv, environment)
  return `${result.stdout}${result.stderr}`
}

describe('the scratch-pad commands', () => {
  it('new creates a scratch pad and prints how to select it', () => {
    const home = temporaryHome()

    expect(output(['new', 'invoice', 'template'], { SCRATCH_PADS_HOME: home })).toBe(
      `created ${home}/2026-03-14-invoice-template\nselect it with --pad 2026-03-14-invoice-template or SCRATCH_PAD=2026-03-14-invoice-template\n`,
    )
  })

  it('new prints the usage when the topic is missing', () => {
    expect(output(['new'], {})).toBe('The topic is missing. Usage: scratch-pad new <topic>\n')
  })

  it('status prints the counts of both inboxes', () => {
    const environment = environmentWithItems()

    expect(output(['status'], environment)).toBe(
      [
        `2026-03-14-export-job · ${environment.SCRATCH_PADS_HOME}/2026-03-14-export-job`,
        'no tasks yet',
        'waiting for the agent: 1 comment, 1 decision, 1 grammar note',
        'waiting for Nick: nothing',
        '',
      ].join('\n'),
    )
  })

  it('inbox prints the comments and the decisions', () => {
    expect(output(['inbox']).split('\n')[0]).toBe('2 new items in 2026-03-14-export-job')
  })

  it('inbox --type prints the requested types', () => {
    expect(output(['inbox', '--type', 'grammar']).split('\n').slice(0, 3)).toStrictEqual([
      '1 new item in 2026-03-14-export-job',
      '',
      '[g-1] grammar note · pages/index.md:6 · section "Retry policy"',
    ])
  })

  it('inbox --all prints the items that were printed before', () => {
    const environment = environmentWithItems()
    output(['inbox'], environment)

    expect(output(['inbox', '--all'], environment).split('\n')[0]).toBe(
      '1 item waits for the agent in 2026-03-14-export-job',
    )
  })

  it('show prints one thread', () => {
    expect(output(['show', 'g-1']).split('\n')[0]).toBe(
      '[g-1] grammar note · pages/index.md:6 · section "Retry policy" · waits for the agent',
    )
  })

  it('reply prints that the thread waits for Nick', () => {
    expect(output(['reply', 'c-1', 'I raised the limit to 8.'])).toBe('c-1 now waits for Nick\n')
  })

  it('done prints that the note is done', () => {
    expect(output(['done', 'g-1', 'Changed the verb.'])).toBe('g-1 is done\n')
  })

  it('pages lists the pages', () => {
    expect(output(['pages'])).toBe('pages/index.md  Export job  2 open threads\n')
  })

  it('outline prints the headings of a page', () => {
    expect(output(['outline', 'pages/index.md'])).toBe('1  # Export job\n3  ## Retry policy\n')
  })

  it('goal prints the goal', () => {
    expect(output(['goal', 'Ship', 'the export job.'])).toBe('goal: Ship the export job.\n')
  })

  it('task start prints the started task', () => {
    const environment = environmentWithItems()
    output(['task', 'add', 'Write the retry policy'], environment)

    expect(output(['task', 'start', '1'], environment)).toBe(
      'task 1 has started: Write the retry policy\n',
    )
  })

  it('task done prints the finished task', () => {
    const environment = environmentWithItems()
    output(['task', 'add', 'Write the retry policy'], environment)

    expect(output(['task', 'done', '1'], environment)).toBe(
      'task 1 is done: Write the retry policy\nno task is left to do\n',
    )
  })

  it('task done prints an error when the task is already done', () => {
    const environment = environmentWithItems()
    output(['task', 'add', 'Write the retry policy'], environment)
    output(['task', 'done', '1'], environment)

    expect(output(['task', 'done', '1'], environment)).toBe(
      'Task 1 is already done. Run "scratch-pad task start 1" to work on it again.\n',
    )
  })

  it('task done prints the usage when the number is not a number', () => {
    expect(output(['task', 'done', 'first'])).toBe(
      '"first" isn\'t a task number. Usage: scratch-pad task done <number>\n',
    )
  })

  it('decide prints the number of the logged decision', () => {
    expect(output(['decide', 'Keep 5 retries.'])).toBe('decision 2 is logged\n')
  })

  it('decide logs a decision that starts with a dash', () => {
    expect(output(['decide', '-5 is too low so keep 8.'])).toBe('decision 2 is logged\n')
  })

  it('inbox prints one line for the decision when only comments are requested and a decision waits', () => {
    expect(output(['inbox', '--type', 'comment']).split('\n').at(-2)).toBe(
      '1 decision waits for the agent (scratch-pad inbox --type decision) · 1 grammar note waits for a subagent',
    )
  })

  it('tasks lists every task with its state when 2 tasks were added', () => {
    const environment = environmentWithItems()
    output(['task', 'add', 'Write the retry policy'], environment)
    output(['task', 'add', 'Write the invoice template'], environment)

    expect(output(['tasks'], environment)).toBe(
      '1  to do  Write the retry policy\n2  to do  Write the invoice template\n',
    )
  })

  it('check prints the problems and returns 1 when a page has a broken link', () => {
    expect(runScratchPad(['check'], environmentWithBrokenLink())).toStrictEqual({
      exitCode: 1,
      stdout:
        "pages/retry.md:3  the link points to pages/queue.md, which doesn't exist\n1 problem in 2 pages\n",
      stderr: '',
    })
  })

  it("check returns 0 when the checked page doesn't have any problems", () => {
    expect(runScratchPad(['check', 'index.md'], environmentWithBrokenLink())).toStrictEqual({
      exitCode: 0,
      stdout: "there aren't any problems in 1 page\n",
      stderr: '',
    })
  })

  it("check prints an error when SCRATCH_PAD_PROSE_CHECK points at a file that doesn't exist", () => {
    const environment = environmentWithItems()
    const executable = join(environment.SCRATCH_PADS_HOME, 'missing.sh')

    expect(
      runScratchPad(['check'], { ...environment, SCRATCH_PAD_PROSE_CHECK: executable }).stderr,
    ).toBe(
      `SCRATCH_PAD_PROSE_CHECK is ${executable}, which can't be run (spawnSync ${executable} ENOENT). Point it at an executable or unset it.\n`,
    )
  })
})

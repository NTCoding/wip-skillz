import { afterEach, describe, expect, it } from 'vitest'
import { missingLinksText } from '../item-links/item-links-fixtures'
import { removeTemporaryHomes } from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { environmentWithScratchPad, runScratchPad } from './command-line-fixtures'

afterEach(() => {
  removeTemporaryHomes()
})

async function output(
  argv: readonly string[],
  environment = environmentWithScratchPad(),
): Promise<string> {
  const result = await runScratchPad(argv, environment)
  return `${result.stdout}${result.stderr}`
}

describe('the commands for the description of a task', () => {
  it('task describe replaces the description of the task with the Markdown from standard input', async () => {
    const environment = environmentWithScratchPad()
    await output(['task', 'add', 'Write the retry policy'], environment)
    const describe = (markdown: string) =>
      runScratchPad(['task', 'describe', '1'], environment, {
        readStandardInput: () => Promise.resolve(markdown),
      })
    await describe('- The first version\n')

    expect(await describe('- The limit is on [the retry limit](retry-limit.md).\n')).toStrictEqual({
      exitCode: 0,
      stdout: `[t-1] task 1 is described: Write the retry policy\n${missingLinksText}\n`,
      stderr: '',
    })
    expect(await output(['task', 'show', '1'], environment)).toBe(
      [
        '[t-1] task 1 is to do: Write the retry policy',
        'description:',
        '- The limit is on [the retry limit](retry-limit.md).',
        missingLinksText,
        '',
      ].join('\n'),
    )
  })

  it('task describe prints an error and keeps the description when standard input is empty', async () => {
    const environment = environmentWithScratchPad()
    await output(['task', 'add', 'Write the retry policy'], environment)

    expect(await runScratchPad(['task', 'describe', '1'], environment)).toStrictEqual({
      exitCode: 1,
      stdout: '',
      stderr:
        'The description is empty. Write the description in Markdown on standard input, for example with a heredoc.\n',
    })
  })

  it('task show prints an error when the tracker does not have the task', async () => {
    expect(await output(['task', 'show', '3'])).toBe(
      "There isn't any task 3 because the progress tracker doesn't have any tasks yet.\n",
    )
  })
})

describe('the commands for subtasks and moves', () => {
  async function environmentWithTasks() {
    const environment = environmentWithScratchPad()
    await output(['task', 'add', 'Design the export job'], environment)
    await output(['task', 'add', 'Build the export job'], environment)
    await output(['subtask', 'add', '2', 'Retry', 'a failed export'], environment)
    await output(['subtask', 'add', '2', 'Log each retry'], environment)
    return environment
  }

  it('subtask add prints the new subtask with its id and its number', async () => {
    const environment = await environmentWithTasks()

    expect(await output(['subtask', 'add', '2', 'Alert the team'], environment)).toBe(
      `[t-5] subtask 2.3 added: Alert the team\n${missingLinksText}\n`,
    )
  })

  it('subtask add prints an error when the task number is the number of a subtask', async () => {
    expect(await output(['subtask', 'add', '2.1', 'Alert the team'])).toBe(
      `"2.1" is the number of a subtask, but a subtask can't have subtasks. Add the subtask to task 2 instead.\n`,
    )
  })

  it('subtask start and subtask done print the subtask and the next subtask that has started', async () => {
    const environment = await environmentWithTasks()
    await output(['subtask', 'start', '2.1'], environment)

    expect(await output(['subtask', 'done', '2.1'], environment)).toBe(
      [
        '[t-3] subtask 2.1 is done: Retry a failed export',
        '[t-4] subtask 2.2 has started: Log each retry',
        missingLinksText,
        '',
      ].join('\n'),
    )
  })

  it('subtask describe and subtask show write and print the description of a subtask', async () => {
    const environment = await environmentWithTasks()
    await runScratchPad(['subtask', 'describe', '2.2'], environment, {
      readStandardInput: () => Promise.resolve('- One line per retry.\n'),
    })

    expect(await output(['subtask', 'show', '2.2'], environment)).toBe(
      [
        '[t-4] subtask 2.2 is to do: Log each retry',
        'description:',
        '- One line per retry.',
        missingLinksText,
        '',
      ].join('\n'),
    )
  })

  it('task start prints the subtasks of a task that has subtasks', async () => {
    const environment = await environmentWithTasks()

    expect(await output(['task', 'start', '2'], environment)).toBe(
      [
        'Task 2 has subtasks, so its state follows the states of its subtasks. Start or finish one of its subtasks instead:',
        '  2.1  [t-3]  to do  Retry a failed export',
        '  2.2  [t-4]  to do  Log each retry',
        '',
      ].join('\n'),
    )
  })

  it('task move moves the task with its subtasks and prints the tasks with their new numbers', async () => {
    const environment = await environmentWithTasks()

    expect(await output(['task', 'move', '2', '--before', '1'], environment)).toBe(
      [
        '[t-2] task 2 is now task 1: Build the export job',
        '1    [t-2]  to do  Build the export job',
        '1.1  [t-3]  to do  Retry a failed export',
        '1.2  [t-4]  to do  Log each retry',
        '2    [t-1]  to do  Design the export job',
        missingLinksText,
        '',
      ].join('\n'),
    )
  })

  it('subtask move moves the subtask among the subtasks of its task', async () => {
    const environment = await environmentWithTasks()

    expect(
      (await output(['subtask', 'move', '2.1', '--after', '2.2'], environment)).split('\n')[0],
    ).toBe('[t-3] subtask 2.1 is now subtask 2.2: Retry a failed export')
  })

  it('task move prints an error when neither --before nor --after is given', async () => {
    const environment = await environmentWithTasks()

    expect(await output(['task', 'move', '2'], environment)).toBe(
      'Pass either --before <number> or --after <number>. Usage: scratch-pad task move <number> --before|--after <number>\n',
    )
  })
})

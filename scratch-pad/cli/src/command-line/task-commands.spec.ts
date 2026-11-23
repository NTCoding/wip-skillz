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

describe('the commands that assign a task or a subtask to Nick', () => {
  const doAndWhy = [
    '--do',
    'Run the migration on staging',
    '--why',
    "The agent can't reach staging",
  ]

  async function environmentWithAssignedTask() {
    const environment = environmentWithScratchPad()
    await output(['task', 'add', 'Design the export job'], environment)
    await output(['task', 'add', 'Migrate the orders'], environment)
    await output(
      ['task', 'assign', '--pad', environment.SCRATCH_PAD, '2', ...doAndWhy],
      environment,
    )
    return environment
  }

  it('task assign prints the assigned task and tasks marks it as assigned to Nick', async () => {
    const environment = environmentWithScratchPad()
    await output(['task', 'add', 'Migrate the orders'], environment)

    expect(await output(['task', 'assign', '1', ...doAndWhy], environment)).toBe(
      `[t-1] task 1 is assigned to Nick: Migrate the orders\n${missingLinksText}\n`,
    )
    expect(await output(['tasks'], environment)).toBe(
      `1  [t-1]  to do  Migrate the orders · assigned to Nick\n${missingLinksText}\n`,
    )
  })

  it('task show prints what Nick has to do and why the agent cannot do it', async () => {
    const environment = await environmentWithAssignedTask()

    expect(await output(['task', 'show', '2'], environment)).toBe(
      [
        '[t-2] task 2 is to do: Migrate the orders',
        'assigned to Nick:',
        '  do:  Run the migration on staging',
        "  why: The agent can't reach staging",
        "there isn't any description yet (write one with task describe)",
        missingLinksText,
        '',
      ].join('\n'),
    )
  })

  it('task assign prints an error when the --do option is missing', async () => {
    const environment = await environmentWithAssignedTask()

    expect(await output(['task', 'assign', '1', '--why', 'It needs SQL'], environment)).toBe(
      'The --do option is missing. Usage: scratch-pad task assign <number> --do <text> --why <text>\n',
    )
  })

  it('subtask assign prints an error when the --why option is missing', async () => {
    const environment = await environmentWithAssignedTask()
    await output(['subtask', 'add', '2', 'Check the orders table'], environment)

    expect(await output(['subtask', 'assign', '2.1', '--do', 'Check it'], environment)).toBe(
      'The --why option is missing. Usage: scratch-pad subtask assign <number> --do <text> --why <text>\n',
    )
  })

  it('task assign prints an error and keeps the task when the text of an option is not in quotes', async () => {
    const environment = environmentWithScratchPad()
    await output(['task', 'add', 'Migrate the orders'], environment)
    const unquoted = ['--do', 'Run', 'the', 'migration', '--why', 'needs', 'creds']

    expect(await runScratchPad(['task', 'assign', '1', ...unquoted], environment)).toStrictEqual({
      exitCode: 1,
      stdout: '',
      stderr:
        '"the migration creds" isn\'t the number or the text of an option. Put the text of --do and --why in quotes, like --do "Run the migration on staging". Usage: scratch-pad task assign <number> --do <text> --why <text>\n',
    })
    expect(await output(['tasks'], environment)).toBe(
      `1  [t-1]  to do  Migrate the orders\n${missingLinksText}\n`,
    )
  })

  it('subtask assign prints an error when another word follows the number', async () => {
    const environment = await environmentWithAssignedTask()
    await output(['subtask', 'add', '2', 'Check the orders table'], environment)

    expect(await output(['subtask', 'assign', '2.1', 'now', ...doAndWhy], environment)).toBe(
      '"now" isn\'t the number or the text of an option. Put the text of --do and --why in quotes, like --do "Run the migration on staging". Usage: scratch-pad subtask assign <number> --do <text> --why <text>\n',
    )
  })

  it('task move keeps the assignment of the moved task and of the subtasks that are numbered again', async () => {
    const environment = await environmentWithAssignedTask()
    await output(['subtask', 'add', '1', 'Write the schema'], environment)
    await output(['subtask', 'assign', '1.1', ...doAndWhy], environment)
    await output(['task', 'move', '2', '--before', '1'], environment)

    expect(await output(['tasks'], environment)).toBe(
      [
        '1    [t-2]  to do  Migrate the orders · assigned to Nick',
        '2    [t-1]  to do  Design the export job',
        '2.1  [t-3]  to do  Write the schema · assigned to Nick',
        missingLinksText,
        '',
      ].join('\n'),
    )
  })

  it('subtask move keeps the assignment of the moved subtask', async () => {
    const environment = await environmentWithAssignedTask()
    await output(['subtask', 'add', '1', 'Write the schema'], environment)
    await output(['subtask', 'add', '1', 'Write the job'], environment)
    await output(['subtask', 'assign', '1.2', ...doAndWhy], environment)
    await output(['subtask', 'move', '1.2', '--before', '1.1'], environment)

    expect(await output(['tasks'], environment)).toBe(
      [
        '1    [t-1]  to do  Design the export job',
        '1.1  [t-4]  to do  Write the job · assigned to Nick',
        '1.2  [t-3]  to do  Write the schema',
        '2    [t-2]  to do  Migrate the orders · assigned to Nick',
        missingLinksText,
        '',
      ].join('\n'),
    )
  })

  it('subtask add under an assigned task asks which subtasks Nick has to do', async () => {
    const environment = await environmentWithAssignedTask()

    expect(await output(['subtask', 'add', '2', 'Run the migration on staging'], environment)).toBe(
      [
        '[t-3] subtask 2.1 added: Run the migration on staging',
        missingLinksText,
        'Task 2 is assigned to Nick and now has subtasks.',
        'Which subtasks does Nick have to do?',
        'Run "subtask assign <number> --do ... --why ..." for each one.',
        'The current assignment of task 2, which you can reuse:',
        '  do:  Run the migration on staging',
        "  why: The agent can't reach staging",
        '',
      ].join('\n'),
    )
  })

  it('task assign prints the subtasks of a task that has subtasks', async () => {
    const environment = await environmentWithAssignedTask()
    await output(['subtask', 'add', '2', 'Run the migration on staging'], environment)
    await output(['subtask', 'add', '2', 'Check the orders table'], environment)

    expect(await runScratchPad(['task', 'assign', '2', ...doAndWhy], environment)).toStrictEqual({
      exitCode: 1,
      stdout: '',
      stderr: [
        "Task 2 has subtasks so it can't be assigned as a whole.",
        'Which of its subtasks does Nick have to do?',
        '  2.1  [t-3]  to do  Run the migration on staging',
        '  2.2  [t-4]  to do  Check the orders table',
        'Run "subtask assign <number> --do ... --why ..." for each one.',
        '',
      ].join('\n'),
    })
  })

  it('task unassign removes the assignment so that the problem of the task with subtasks is fixed', async () => {
    const environment = await environmentWithAssignedTask()
    await output(['subtask', 'add', '2', 'Check the orders table'], environment)

    expect(await output(['task', 'unassign', '2'], environment)).toBe(
      `[t-2] task 2 isn't assigned to Nick any more: Migrate the orders\n${missingLinksText}\n`,
    )
    expect(await output(['check'], environment)).toBe("there aren't any problems in 1 page\n")
  })

  it('subtask unassign removes the assignment of the subtask', async () => {
    const environment = await environmentWithAssignedTask()
    await output(['subtask', 'add', '2', 'Check the orders table'], environment)
    await output(['subtask', 'assign', '2.1', ...doAndWhy], environment)

    expect(await output(['subtask', 'unassign', '2.1'], environment)).toBe(
      `[t-3] subtask 2.1 isn't assigned to Nick any more: Check the orders table\n${missingLinksText}\n`,
    )
  })

  it('task unassign prints an error when the task is not assigned to Nick', async () => {
    const environment = await environmentWithAssignedTask()

    expect(await runScratchPad(['task', 'unassign', '1'], environment)).toStrictEqual({
      exitCode: 1,
      stdout: '',
      stderr: "Task 1 isn't assigned to Nick so there is nothing to remove.\n",
    })
  })

  it('check reports the assigned task with subtasks until one of its subtasks is assigned', async () => {
    const environment = await environmentWithAssignedTask()
    await output(['subtask', 'add', '2', 'Run the migration on staging'], environment)
    const before = await output(['check'], environment)

    expect(await output(['subtask', 'assign', '2.1', ...doAndWhy], environment)).toBe(
      [
        '[t-3] subtask 2.1 is assigned to Nick: Run the migration on staging',
        "[t-2] task 2 isn't assigned to Nick any more, because subtask 2.1 is assigned to him now: Migrate the orders",
        missingLinksText,
        '',
      ].join('\n'),
    )
    expect([before, await output(['check'], environment)]).toStrictEqual([
      [
        'the progress tracker  task 2 [t-2] is assigned to Nick but has subtasks. Run subtask assign for each subtask that Nick has to do',
        '1 problem in 1 page',
        '',
      ].join('\n'),
      "there aren't any problems in 1 page\n",
    ])
  })
})

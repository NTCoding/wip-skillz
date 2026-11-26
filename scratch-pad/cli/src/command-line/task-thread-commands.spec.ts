import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { missingLinksText } from '../item-links/item-links-fixtures'
import { nickCommentsOnTask } from '../nick-actions/nick-actions'
import { ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { removeTemporaryHomes } from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { environmentWithScratchPad, runScratchPad, waitReminderText } from './command-line-fixtures'

afterEach(() => {
  removeTemporaryHomes()
})

async function output(
  argv: readonly string[],
  environment: ReturnType<typeof environmentWithScratchPad>,
): Promise<string> {
  const result = await runScratchPad(argv, environment)
  return `${result.stdout}${result.stderr}`
}

// Nick starts the thread of task 1 from its row on the progress tracker.
async function taskWithNickThread() {
  const environment = environmentWithScratchPad()
  await output(['task', 'add', 'Check the export log'], environment)
  await output(['task', 'assign', '1', '--do', 'Read the log', '--why', 'No access'], environment)
  nickCommentsOnTask(
    new ScratchPadFolder(join(environment.SCRATCH_PADS_HOME, environment.SCRATCH_PAD)),
    't-1',
    'Which log should I read?',
  )
  return environment
}

describe('show and reply on the thread of a task', () => {
  it('show prints the thread of a task with the task and every message', async () => {
    const environment = await taskWithNickThread()

    expect(await output(['show', 'c-1'], environment)).toMatch(
      /^\[c-1\] comment · task 1: Check the export log · waits for the agent\n {2}Nick \(.+\): Which log should I read\?\n/u,
    )
  })

  it('reply adds the reply of the agent to the thread of a task', async () => {
    const environment = await taskWithNickThread()

    expect(await output(['reply', 'c-1', 'It is the export log.'], environment)).toBe(
      ['c-1 now waits for Nick', missingLinksText, waitReminderText, ''].join('\n'),
    )
  })
})

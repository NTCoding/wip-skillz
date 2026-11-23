import { afterEach, describe, expect, it } from 'vitest'
import {
  addSubtaskToTracker,
  addTaskToTracker,
  describeSubtaskInTracker,
  describeTaskInTracker,
} from '../agent-commands/progress-tracker-commands'
import { itemLinks } from '../item-links/item-links'
import {
  exportJobScratchPad,
  removeTemporaryHomes,
  temporaryHome,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { progressTrackerOf } from './nick-views'

afterEach(() => {
  removeTemporaryHomes()
})

describe('progressTrackerOf', () => {
  it('returns the title, the goal and the tasks of the progress tracker', () => {
    const folder = exportJobScratchPad(temporaryHome())
    addTaskToTracker(folder, 'Export the invoices')

    expect(progressTrackerOf(folder)).toStrictEqual({
      title: 'Export job',
      goal: undefined,
      tasks: [
        {
          id: 't-1',
          number: 1,
          title: 'Export the invoices',
          state: 'to-do',
          html: undefined,
          links: [],
          subtasks: [],
        },
      ],
    })
  })

  it('returns the description of a subtask as HTML under its task', () => {
    const folder = exportJobScratchPad(temporaryHome())
    addTaskToTracker(folder, 'Export the invoices')
    addSubtaskToTracker(folder, 1, 'Retry a failed export')
    describeSubtaskInTracker(
      folder,
      { task: 1, subtask: 1 },
      '- See [the retry limit](retry-limit.md).',
      itemLinks(folder.name, undefined),
    )

    const [task] = progressTrackerOf(folder).tasks

    expect(
      task?.subtasks.map((subtask) => [subtask.id, subtask.number, subtask.html]),
    ).toStrictEqual([
      [
        't-2',
        '1.1',
        '<ul data-lines="1-1">\n<li>See <a href="retry-limit.md">the retry limit</a>.</li>\n</ul>\n',
      ],
    ])
  })

  it('returns the description of a task as HTML with its links to the pages', () => {
    const folder = exportJobScratchPad(temporaryHome())
    addTaskToTracker(folder, 'Export the invoices')
    describeTaskInTracker(
      folder,
      1,
      '- The job retries [5 times](retry-limit.md#the-default).',
      itemLinks(folder.name, undefined),
    )

    const [task] = progressTrackerOf(folder).tasks

    expect(task?.html).toBe(
      '<ul data-lines="1-1">\n<li>The job retries <a href="retry-limit.md#the-default">5 times</a>.</li>\n</ul>\n',
    )
    expect(task?.links).toStrictEqual([
      {
        kind: 'page',
        href: 'retry-limit.md#the-default',
        page: 'pages/retry-limit.md',
        headingId: 'the-default',
        line: 1,
      },
    ])
  })
})

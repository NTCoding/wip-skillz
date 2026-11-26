import { afterEach, describe, expect, it } from 'vitest'
import {
  addSubtaskToTracker,
  addTaskToTracker,
  assignSubtaskInTracker,
  describeSubtaskInTracker,
  describeTaskInTracker,
} from '../agent-commands/progress-tracker-commands'
import { itemLinks } from '../item-links/item-links'
import {
  exportJobScratchPad,
  removeTemporaryHomes,
  temporaryHome,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { progressTrackerOf } from './progress-tracker-of'

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
          assignment: undefined,
          subtasks: [],
        },
      ],
    })
  })

  it('returns the description of a subtask as HTML under its task', () => {
    const folder = exportJobScratchPad(temporaryHome())
    addTaskToTracker(folder, 'Export the invoices')
    addSubtaskToTracker(folder, 1, 'Retry a failed export', itemLinks(folder.name, undefined))
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

  it('returns the assignment of a subtask to Nick with the HTML and the links of both texts', () => {
    const folder = exportJobScratchPad(temporaryHome())
    const links = itemLinks(folder.name, undefined)
    addTaskToTracker(folder, 'Export the invoices')
    addSubtaskToTracker(folder, 1, 'Retry a failed export', links)
    assignSubtaskInTracker(
      folder,
      { task: 1, subtask: 1 },
      { do: 'Restart the job on [the limit](retry-limit.md#the-limit)', why: 'See https://x.dev' },
      links,
    )

    expect(progressTrackerOf(folder).tasks[0]?.subtasks[0]?.assignment).toStrictEqual({
      assignee: 'user',
      do: 'Restart the job on [the limit](retry-limit.md#the-limit)',
      why: 'See https://x.dev',
      doHtml: '<p>Restart the job on <a href="retry-limit.md#the-limit">the limit</a></p>\n',
      whyHtml: '<p>See <a href="https://x.dev">https://x.dev</a></p>\n',
      links: [
        {
          kind: 'page',
          line: 1,
          href: 'retry-limit.md#the-limit',
          page: 'pages/retry-limit.md',
          headingId: 'the-limit',
        },
        { kind: 'other', line: 1, href: 'https://x.dev' },
      ],
    })
  })

  it("doesn't return any assignment for a task that isn't assigned to Nick", () => {
    const folder = exportJobScratchPad(temporaryHome())
    addTaskToTracker(folder, 'Export the invoices')

    expect(progressTrackerOf(folder).tasks[0]?.assignment).toBeUndefined()
  })
})

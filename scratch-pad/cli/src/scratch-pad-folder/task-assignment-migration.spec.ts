import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, describe, expect, it } from 'vitest'
import { assignSubtask } from '../progress-tracker/task-assignments'
import {
  exportJobScratchPad,
  removeTemporaryHomes,
  runSqlOnPadDb,
  tasksTableOfVersion6,
  temporaryHome,
} from './scratch-pad-folder-fixtures'
import { type ScratchPadFolder } from './scratch-pad-folder'

function userVersion(folder: ScratchPadFolder): unknown {
  const db = new DatabaseSync(join(folder.path, 'pad.db'))
  try {
    return db.prepare('PRAGMA user_version').get()?.['user_version']
  } finally {
    db.close()
  }
}

afterEach(() => {
  removeTemporaryHomes()
})

// Task 2 has the subtask 2.1, which has the id t-3.
function scratchPadOfVersion6(): ScratchPadFolder {
  const folder = exportJobScratchPad(temporaryHome())
  runSqlOnPadDb(
    folder,
    `${tasksTableOfVersion6}
     INSERT INTO tasks (id, parent_id, position, title, state, description)
     VALUES ('t-1', NULL, 1, 'Design the export job', 'done', '- The job runs every night.'),
            ('t-2', NULL, 2, 'Build the export job', 'in-progress', NULL),
            ('t-3', 't-2', 1, 'Run the job on staging', 'in-progress', NULL);
     PRAGMA user_version = 6`,
  )
  return folder
}

describe('the assignments of the tasks', () => {
  it("keeps the tasks and the subtasks of version 6 and doesn't assign them when pad.db is migrated to version 10", () => {
    const folder = scratchPadOfVersion6()

    expect(folder.read((pad) => pad.readProgressTracker().tasks)).toStrictEqual([
      {
        id: 't-1',
        number: 1,
        title: 'Design the export job',
        state: 'done',
        description: '- The job runs every night.',
        assignment: undefined,
        subtasks: [],
      },
      {
        id: 't-2',
        number: 2,
        title: 'Build the export job',
        state: 'in-progress',
        description: undefined,
        assignment: undefined,
        subtasks: [
          {
            id: 't-3',
            number: '2.1',
            title: 'Run the job on staging',
            state: 'in-progress',
            description: undefined,
            assignment: undefined,
          },
        ],
      },
    ])
    expect(userVersion(folder)).toBe(10)
  })

  it('saves the assignment of a subtask of version 6 after pad.db is migrated', () => {
    const folder = scratchPadOfVersion6()
    const text = { do: 'Run the job on staging', why: "The agent can't reach staging" }
    folder.change((pad) =>
      pad.writeProgressTracker(
        assignSubtask(pad.readProgressTracker(), { task: 2, subtask: 1 }, text).tracker,
      ),
    )

    expect(
      folder.read((pad) => pad.readProgressTracker().tasks[1]?.subtasks[0]?.assignment),
    ).toStrictEqual({ assignee: 'user', ...text })
  })
})

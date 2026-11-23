import { afterEach, describe, expect, it } from 'vitest'
import { addSubtask } from '../progress-tracker/progress-tracker'
import {
  exportJobScratchPad,
  removeTemporaryHomes,
  runSqlOnPadDb,
  tasksTableOfVersion4,
  temporaryHome,
} from './scratch-pad-folder-fixtures'
import { type ScratchPadFolder } from './scratch-pad-folder'

afterEach(() => {
  removeTemporaryHomes()
})

function scratchPadOfVersion5(): ScratchPadFolder {
  const folder = exportJobScratchPad(temporaryHome())
  runSqlOnPadDb(
    folder,
    `${tasksTableOfVersion4}
     ALTER TABLE tasks ADD COLUMN description TEXT;
     INSERT INTO tasks (number, title, state, description)
     VALUES (1, 'Design the export job', 'done', '- The job runs every night.'),
            (2, 'Build the export job', 'in-progress', NULL);
     PRAGMA user_version = 5`,
  )
  return folder
}

describe('the ids of the tasks', () => {
  it('gives each task of version 5 the id with its number when pad.db is migrated to version 6', () => {
    const folder = scratchPadOfVersion5()

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
        subtasks: [],
      },
    ])
  })

  it('gives a new subtask the next id after the ids of the migrated tasks', () => {
    const folder = scratchPadOfVersion5()
    folder.change((pad) =>
      pad.writeProgressTracker(
        addSubtask(pad.readProgressTracker(), 2, 'Retry a failed export').tracker,
      ),
    )

    expect(
      folder.read((pad) => pad.readProgressTracker().tasks[1]?.subtasks.map((each) => each.id)),
    ).toStrictEqual(['t-3'])
  })
})

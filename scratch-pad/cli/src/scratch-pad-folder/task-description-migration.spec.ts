import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, describe, expect, it } from 'vitest'
import {
  exportJobScratchPad,
  removeTemporaryHomes,
  runSqlOnPadDb,
  tasksTableOfVersion4,
  temporaryHome,
} from './scratch-pad-folder-fixtures'
import { type ScratchPadFolder } from './scratch-pad-folder'

function pragma(folder: ScratchPadFolder, name: string): unknown {
  const db = new DatabaseSync(join(folder.path, 'pad.db'))
  try {
    return db.prepare(`PRAGMA ${name}`).get()?.[name]
  } finally {
    db.close()
  }
}

afterEach(() => {
  removeTemporaryHomes()
})

describe('the descriptions of the tasks', () => {
  it('keeps the tasks of version 4 without a description when pad.db is migrated to version 8', () => {
    const folder = exportJobScratchPad(temporaryHome())
    runSqlOnPadDb(
      folder,
      `${tasksTableOfVersion4}
       INSERT INTO tasks (number, title, state) VALUES (1, 'Write the retry policy', 'to-do');
       PRAGMA user_version = 4`,
    )

    expect(folder.read((pad) => pad.readProgressTracker().tasks)).toStrictEqual([
      {
        id: 't-1',
        number: 1,
        title: 'Write the retry policy',
        state: 'to-do',
        description: undefined,
        assignment: undefined,
        subtasks: [],
      },
    ])
    expect(pragma(folder, 'user_version')).toBe(8)
  })
})

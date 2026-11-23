import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, describe, expect, it } from 'vitest'
import {
  exportJobScratchPad,
  removeTemporaryHomes,
  runSqlOnPadDb,
  tasksTableOfVersion4,
  temporaryHome,
  writeFileInPad,
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

describe('the read marks of a scratch pad', () => {
  it("doesn't mark any page as read when the scratch pad is created", () => {
    const folder = exportJobScratchPad(temporaryHome())
    expect(folder.read((pad) => pad.readReadMarks())).toStrictEqual({ pages: [], sections: [] })
  })

  it('marks every page and section as read when a scratch pad of version 3 is migrated to version 7', () => {
    const folder = exportJobScratchPad(temporaryHome())
    writeFileInPad(folder, 'pages/1-retry-limit.md', '# Retry limit\n\n## The default\n\n5.\n')
    runSqlOnPadDb(
      folder,
      `DROP TABLE read_sections; DROP TABLE read_pages; ${tasksTableOfVersion4} PRAGMA user_version = 3`,
    )

    const marks = folder.read((pad) => pad.readReadMarks())

    expect(marks.pages).toStrictEqual(['pages/index.md', 'pages/retry-limit.md'])
    expect(marks.sections.map((mark) => [mark.page, mark.section])).toStrictEqual([
      ['pages/index.md', 'retry-policy'],
      ['pages/retry-limit.md', 'the-default'],
    ])
    expect(pragma(folder, 'user_version')).toBe(7)
  })
})

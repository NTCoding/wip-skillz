import { afterEach, describe, expect, it } from 'vitest'
import { aTaskThread, aThread } from '../threads/thread-fixtures'
import {
  exportJobScratchPad,
  removeTemporaryHomes,
  runSqlOnPadDb,
  temporaryHome,
} from './scratch-pad-folder-fixtures'
import { type ScratchPadFolder } from './scratch-pad-folder'

afterEach(() => {
  removeTemporaryHomes()
})

// The table threads before version 9 added the threads on tasks. Every thread was on a page.
const threadsTableOfVersion8 = `
DROP TABLE outbox;
DROP TABLE messages;
DROP TABLE threads;
CREATE TABLE threads (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  page TEXT NOT NULL,
  first_line INTEGER,
  last_line INTEGER,
  selected_text TEXT,
  prefix TEXT,
  suffix TEXT,
  copies_on_page INTEGER,
  waits_for TEXT NOT NULL,
  outcome TEXT
) STRICT;
CREATE TABLE messages (
  thread_id TEXT NOT NULL REFERENCES threads (id),
  position INTEGER NOT NULL,
  author TEXT NOT NULL,
  text TEXT NOT NULL,
  time TEXT NOT NULL,
  PRIMARY KEY (thread_id, position)
) STRICT;
CREATE TABLE outbox (
  number INTEGER PRIMARY KEY AUTOINCREMENT,
  time TEXT NOT NULL,
  text TEXT NOT NULL,
  thread_id TEXT REFERENCES threads (id),
  page TEXT,
  first_line INTEGER,
  last_line INTEGER,
  selected_text TEXT,
  prefix TEXT,
  suffix TEXT,
  copies_on_page INTEGER
) STRICT;
`

// The comment c-1 is on the index page and has a reply of Nick in the outbox.
function scratchPadOfVersion8(): ScratchPadFolder {
  const folder = exportJobScratchPad(temporaryHome())
  runSqlOnPadDb(
    folder,
    `${threadsTableOfVersion8}
     INSERT INTO threads (id, type, page, first_line, last_line, selected_text, prefix, suffix,
                          waits_for)
     VALUES ('c-1', 'comment', 'pages/index.md', 5, 6, 'The export job retries 5 times.', '',
             'Each retry waits 30 seconds.', 'agent');
     INSERT INTO messages (thread_id, position, author, text, time)
     VALUES ('c-1', 1, 'nick', 'Is 5 retries enough on a slow network?',
             '2026-03-14T09:30:00.000Z');
     INSERT INTO outbox (time, text, thread_id)
     VALUES ('2026-03-14T09:31:00.000Z', 'And on a fast one?', 'c-1');
     PRAGMA user_version = 8`,
  )
  return folder
}

describe('the threads on tasks', () => {
  it('keeps the threads of version 8 on their pages when pad.db is migrated to version 9', () => {
    const folder = scratchPadOfVersion8()

    expect(folder.read((pad) => pad.readThreads())).toStrictEqual([aThread({})])
  })

  it('keeps the replies in the outbox of version 8 when pad.db is migrated to version 9', () => {
    const folder = scratchPadOfVersion8()

    expect(folder.read((pad) => pad.readOutbox()).map((item) => item.text)).toStrictEqual([
      'And on a fast one?',
    ])
  })

  it('saves a thread on a task after pad.db of version 8 is migrated', () => {
    const folder = scratchPadOfVersion8()
    folder.change((pad) => pad.writeThread(aTaskThread({ id: 'c-2' })))

    expect(folder.read((pad) => pad.readThread('c-2'))).toStrictEqual(aTaskThread({ id: 'c-2' }))
  })
})

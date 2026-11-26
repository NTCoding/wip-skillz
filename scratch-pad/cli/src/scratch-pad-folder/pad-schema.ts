import { decisionSources } from '../decisions/decision-log'
import { itemTypes } from '../items/item-id'
import { assignees, taskStates } from '../progress-tracker/progress-tracker'
import { sectionTexts } from '../read-marks/read-marks'
import { authors, threadTypes, waitingParties } from '../threads/thread'
import { type PadDb } from './pad-db'

export const padTables = [
  'progress_tracker',
  'tasks',
  'threads',
  'messages',
  'decisions',
  'decision_log',
  'decision_reviews',
  'events',
  'agent_inbox',
  'improvements',
  'outbox',
  'read_pages',
  'read_sections',
] as const

function oneOf(column: string, values: readonly string[]): string {
  const quoted = values.map((value) => "'" + value + "'").join(', ')
  return `CHECK (${column} IN (${quoted}))`
}

// The code points that String.prototype.trim removes, which are the whitespace and the line breaks
// of JavaScript. The domain trims them before it checks that a text isn't empty.
const trimmedCodePoints = [
  0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x20, 0xa0, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005,
  0x2006, 0x2007, 0x2008, 0x2009, 0x200a, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xfeff,
]

// The trim of SQLite only removes spaces by default. It's passed the same characters as the domain
// trims so that the check fails for a text like a single line break too.
function notEmpty(column: string): string {
  return `CHECK (trim(${column}, char(${trimmedCodePoints.join(', ')})) <> '')`
}

const firstPadTables = `
CREATE TABLE progress_tracker (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  title TEXT NOT NULL,
  goal TEXT
) STRICT;

CREATE TABLE tasks (
  number INTEGER PRIMARY KEY CHECK (number >= 1),
  title TEXT NOT NULL,
  state TEXT NOT NULL ${oneOf('state', taskStates)}
) STRICT;

CREATE TABLE threads (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL ${oneOf('type', threadTypes)},
  page TEXT NOT NULL,
  first_line INTEGER CHECK (first_line >= 1),
  last_line INTEGER CHECK (last_line >= first_line),
  selected_text TEXT,
  prefix TEXT,
  suffix TEXT,
  copies_on_page INTEGER CHECK (copies_on_page >= 0),
  waits_for TEXT NOT NULL ${oneOf('waits_for', waitingParties)},
  outcome TEXT,
  CHECK ((first_line IS NULL) = (last_line IS NULL)),
  CHECK ((first_line IS NULL) = (selected_text IS NULL))
) STRICT;

CREATE TABLE messages (
  thread_id TEXT NOT NULL REFERENCES threads (id),
  position INTEGER NOT NULL CHECK (position >= 1),
  author TEXT NOT NULL ${oneOf('author', authors)},
  text TEXT NOT NULL,
  time TEXT NOT NULL,
  PRIMARY KEY (thread_id, position)
) STRICT;

CREATE TABLE decisions (
  id TEXT PRIMARY KEY,
  page TEXT NOT NULL,
  line INTEGER NOT NULL CHECK (line >= 1),
  question TEXT NOT NULL,
  choice TEXT,
  written_answer TEXT,
  outcome TEXT,
  time TEXT NOT NULL,
  CHECK ((choice IS NULL) <> (written_answer IS NULL))
) STRICT;

CREATE TABLE decision_log (
  number INTEGER PRIMARY KEY CHECK (number >= 1),
  time TEXT NOT NULL,
  source TEXT NOT NULL ${oneOf('source', decisionSources)},
  text TEXT NOT NULL,
  decision_id TEXT UNIQUE
) STRICT;

CREATE TABLE events (
  number INTEGER PRIMARY KEY AUTOINCREMENT,
  time TEXT NOT NULL,
  kind TEXT NOT NULL,
  author TEXT NOT NULL ${oneOf('author', authors)},
  item TEXT
) STRICT;

CREATE TABLE agent_inbox (
  item_type TEXT PRIMARY KEY ${oneOf('item_type', itemTypes)},
  last_printed_event INTEGER NOT NULL CHECK (last_printed_event >= 0)
) STRICT;

PRAGMA user_version = 1;
`

export interface PageMarkdown {
  readonly page: string
  readonly markdown: string
}

// fill only runs when an existing scratch pad is migrated, after the migration's SQL. A new
// scratch pad doesn't run it.
export interface PadMigration {
  readonly version: number
  readonly sql: string
  readonly fill?: (pad: PadDb, pages: readonly PageMarkdown[]) => void
}

export interface PadSchema {
  readonly version: number
  readonly firstTables: string
  readonly migrations: readonly PadMigration[]
}

// AUTOINCREMENT never gives a new improvement the number of a deleted one, so an old link to an
// improvement never opens another improvement.
const improvementsTable = `
CREATE TABLE improvements (
  number INTEGER PRIMARY KEY AUTOINCREMENT CHECK (number >= 1),
  time TEXT NOT NULL,
  title TEXT NOT NULL,
  details TEXT
) STRICT;
`

// A queued comment has a page and an anchor, whereas a queued reply has the id of its thread.
// AUTOINCREMENT never gives a new item the number of a removed one, so a page that is out of date
// never edits or removes another item.
const outboxTable = `
CREATE TABLE outbox (
  number INTEGER PRIMARY KEY AUTOINCREMENT CHECK (number >= 1),
  time TEXT NOT NULL,
  text TEXT NOT NULL,
  thread_id TEXT REFERENCES threads (id),
  page TEXT,
  first_line INTEGER CHECK (first_line >= 1),
  last_line INTEGER CHECK (last_line >= first_line),
  selected_text TEXT,
  prefix TEXT,
  suffix TEXT,
  copies_on_page INTEGER CHECK (copies_on_page >= 0),
  CHECK ((thread_id IS NULL) <> (page IS NULL)),
  CHECK ((page IS NULL) = (first_line IS NULL)),
  CHECK ((first_line IS NULL) = (last_line IS NULL)),
  CHECK ((first_line IS NULL) = (selected_text IS NULL))
) STRICT;
`

// A page that Nick has read has a row in read_pages. Each section that he has read has a row in
// read_sections with the hash of the section's text at that moment.
const readMarksTables = `
CREATE TABLE read_pages (
  page TEXT PRIMARY KEY
) STRICT;

CREATE TABLE read_sections (
  page TEXT NOT NULL,
  section TEXT NOT NULL,
  hash TEXT NOT NULL,
  PRIMARY KEY (page, section)
) STRICT;
`

// The read marks are new in version 4. Every page of an existing scratch pad counts as read then,
// so that Nick doesn't see every page of an older scratch pad as new.
function markEveryPageRead(pad: PadDb, pages: readonly PageMarkdown[]): void {
  pages.forEach(({ page, markdown }) => pad.markPageRead(page, sectionTexts(markdown, page)))
}

// The description of a task is new in version 5. A task of an existing scratch pad doesn't have a
// description until the agent writes one with `task describe`.
const taskDescriptionColumn = `
ALTER TABLE tasks ADD COLUMN description TEXT;
`

// Version 6 gives each task an id that never changes, like t-4, and adds the subtasks. A subtask has
// the id of its task in parent_id. The position of a task is its place among the tasks, and the
// position of a subtask is its place among the subtasks of its task. A task of an older scratch pad
// keeps its number as its position and gets the id with the same number.
const taskIdsAndSubtasks = `
CREATE TABLE tasks_with_ids (
  id TEXT PRIMARY KEY CHECK (id GLOB 't-[1-9]*'),
  parent_id TEXT,
  position INTEGER NOT NULL CHECK (position >= 1),
  title TEXT NOT NULL,
  state TEXT NOT NULL ${oneOf('state', taskStates)},
  description TEXT,
  CHECK (parent_id IS NULL OR parent_id <> id)
) STRICT;
INSERT INTO tasks_with_ids (id, parent_id, position, title, state, description)
  SELECT 't-' || number, NULL, number, title, state, description FROM tasks;
DROP TABLE tasks;
ALTER TABLE tasks_with_ids RENAME TO tasks;
`

// Version 7 adds the assignment of a task or a subtask to Nick. The only assignee is user, who is
// Nick. An assigned task has what Nick has to do in assignment_do and why the agent can't do it in
// assignment_why. Neither of them can be empty. A task of an older scratch pad isn't assigned.
const taskAssignments = `
CREATE TABLE tasks_with_assignments (
  id TEXT PRIMARY KEY CHECK (id GLOB 't-[1-9]*'),
  parent_id TEXT,
  position INTEGER NOT NULL CHECK (position >= 1),
  title TEXT NOT NULL,
  state TEXT NOT NULL ${oneOf('state', taskStates)},
  description TEXT,
  assignee TEXT ${oneOf('assignee', assignees)},
  assignment_do TEXT ${notEmpty('assignment_do')},
  assignment_why TEXT ${notEmpty('assignment_why')},
  CHECK (parent_id IS NULL OR parent_id <> id),
  CHECK ((assignee IS NULL) = (assignment_do IS NULL)),
  CHECK ((assignee IS NULL) = (assignment_why IS NULL))
) STRICT;
INSERT INTO tasks_with_assignments (id, parent_id, position, title, state, description)
  SELECT id, parent_id, position, title, state, description FROM tasks;
DROP TABLE tasks;
ALTER TABLE tasks_with_assignments RENAME TO tasks;
`

// Version 8 adds the reviews of decisions. Each row is one round of changes that Nick has requested
// on a decision. The rounds of a decision are numbered from 1 and every round is kept. The reason
// can't be empty. The outcome is the line that the agent wrote when reopening the decision, so a
// round without an outcome waits for the agent. A decision of an older scratch pad doesn't have a
// round.
const decisionReviewsTable = `
CREATE TABLE decision_reviews (
  id TEXT NOT NULL,
  round INTEGER NOT NULL CHECK (round >= 1),
  page TEXT NOT NULL,
  line INTEGER NOT NULL CHECK (line >= 1),
  question TEXT NOT NULL,
  reason TEXT NOT NULL ${notEmpty('reason')},
  outcome TEXT ${notEmpty('outcome')},
  time TEXT NOT NULL,
  PRIMARY KEY (id, round)
) STRICT;
`

// Version 9 adds the threads on a task or a subtask, which have the id of the task in task_id
// instead of a page. A thread on a task doesn't have an anchor, and a task has one thread at most.
// The threads are copied to a new table, because SQLite can't remove the NOT NULL of page. The
// messages and the outbox refer to the threads so the foreign keys are only checked at the commit,
// once every thread is back in the table. A thread of an older scratch pad is on a page.
const threadsOnTasks = `
PRAGMA defer_foreign_keys = ON;
CREATE TEMP TABLE threads_on_pages AS SELECT * FROM threads;
DROP TABLE threads;
CREATE TABLE threads (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL ${oneOf('type', threadTypes)},
  page TEXT,
  task_id TEXT UNIQUE CHECK (task_id GLOB 't-[1-9]*'),
  first_line INTEGER CHECK (first_line >= 1),
  last_line INTEGER CHECK (last_line >= first_line),
  selected_text TEXT,
  prefix TEXT,
  suffix TEXT,
  copies_on_page INTEGER CHECK (copies_on_page >= 0),
  waits_for TEXT NOT NULL ${oneOf('waits_for', waitingParties)},
  outcome TEXT,
  CHECK ((page IS NULL) <> (task_id IS NULL)),
  CHECK (task_id IS NULL OR first_line IS NULL),
  CHECK ((first_line IS NULL) = (last_line IS NULL)),
  CHECK ((first_line IS NULL) = (selected_text IS NULL))
) STRICT;
INSERT INTO threads
  (id, type, page, first_line, last_line, selected_text, prefix, suffix, copies_on_page, waits_for,
   outcome)
  SELECT id, type, page, first_line, last_line, selected_text, prefix, suffix, copies_on_page,
    waits_for, outcome
  FROM threads_on_pages;
DROP TABLE threads_on_pages;
`

export const padSchema: PadSchema = {
  version: 9,
  firstTables: firstPadTables,
  migrations: [
    { version: 2, sql: improvementsTable },
    { version: 3, sql: outboxTable },
    { version: 4, sql: readMarksTables, fill: markEveryPageRead },
    { version: 5, sql: taskDescriptionColumn },
    { version: 6, sql: taskIdsAndSubtasks },
    { version: 7, sql: taskAssignments },
    { version: 8, sql: decisionReviewsTable },
    { version: 9, sql: threadsOnTasks },
  ],
}

export function padMigrationFillsAfter(
  schema: PadSchema,
  version: number,
): NonNullable<PadMigration['fill']>[] {
  return schema.migrations.flatMap((migration) =>
    migration.version > version && migration.fill !== undefined ? [migration.fill] : [],
  )
}

export function padMigrationsAfter(schema: PadSchema, version: number): string {
  const steps = schema.migrations.filter((migration) => migration.version > version)
  return [
    ...steps.map((migration) => migration.sql),
    `PRAGMA user_version = ${schema.version};`,
  ].join('\n')
}

export function newPadDbSql(schema: PadSchema): string {
  return `${schema.firstTables}${padMigrationsAfter(schema, 1)}`
}

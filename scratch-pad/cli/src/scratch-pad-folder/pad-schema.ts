import { decisionSources } from '../decisions/decision-log'
import { itemTypes } from '../items/item-id'
import { taskStates } from '../progress-tracker/progress-tracker'
import { authors, threadTypes, waitingParties } from '../threads/thread'

export const padTables = [
  'progress_tracker',
  'tasks',
  'threads',
  'messages',
  'decisions',
  'decision_log',
  'events',
  'agent_inbox',
  'improvements',
  'outbox',
] as const

function oneOf(column: string, values: readonly string[]): string {
  const quoted = values.map((value) => "'" + value + "'").join(', ')
  return `CHECK (${column} IN (${quoted}))`
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

export interface PadMigration {
  readonly version: number
  readonly sql: string
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

export const padSchema: PadSchema = {
  version: 3,
  firstTables: firstPadTables,
  migrations: [
    { version: 2, sql: improvementsTable },
    { version: 3, sql: outboxTable },
  ],
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

import { decisionSources } from '../decisions/decision-log'
import { itemTypes } from '../items/item-id'
import { taskStates } from '../progress-tracker/progress-tracker'
import { authors, threadTypes, waitingParties } from '../threads/thread'

export const padSchemaVersion = 1

function oneOf(column: string, values: readonly string[]): string {
  const quoted = values.map((value) => "'" + value + "'").join(', ')
  return `CHECK (${column} IN (${quoted}))`
}

export const padSchema = `
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
  seen_by_agent INTEGER NOT NULL CHECK (seen_by_agent IN (0, 1)),
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

PRAGMA user_version = ${padSchemaVersion};
`

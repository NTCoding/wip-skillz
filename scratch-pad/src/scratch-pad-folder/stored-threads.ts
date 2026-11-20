import { type DatabaseSync } from 'node:sqlite'
import { byItemNumber, itemTypeOf, type ItemType } from '../items/item-id'
import { ScratchPadError } from '../scratch-pad-error'
import {
  authors,
  threadTypes,
  waitingParties,
  type Anchor,
  type Message,
  type Thread,
} from '../threads/thread'
import { BrokenPadDbError } from './pad-db-errors'
import { readSavedValues, type SavedValues } from './saved-values'

export class UnknownThreadError extends ScratchPadError {
  constructor(id: string, type: ItemType, padName: string) {
    super(
      `There isn't any thread called ${id} in ${padName}. Run "scratch-pad inbox --all --type ${type}" to list the threads that wait for the agent.`,
    )
  }
}

export class StoredThreads {
  constructor(
    private readonly db: DatabaseSync,
    private readonly padName: string,
  ) {}

  readAll(): Thread[] {
    const messages = readSavedValues(
      this.db,
      this.padName,
      'messages',
      'SELECT thread_id, author, text, time FROM messages ORDER BY thread_id, position',
    )
    return readSavedValues(this.db, this.padName, 'threads', 'SELECT * FROM threads')
      .map((thread) =>
        this.threadFrom(
          thread,
          messages.filter((message) => message.text('thread_id') === thread.text('id')),
        ),
      )
      .toSorted((first, second) => byItemNumber(first.id, second.id))
  }

  read(id: string): Thread {
    const type = itemTypeOf(id)
    const [thread] = readSavedValues(
      this.db,
      this.padName,
      'threads',
      'SELECT * FROM threads WHERE id = ?',
      id,
    )
    if (thread === undefined) {
      throw new UnknownThreadError(id, type, this.padName)
    }
    return this.threadFrom(
      thread,
      readSavedValues(
        this.db,
        this.padName,
        'messages',
        'SELECT author, text, time FROM messages WHERE thread_id = ? ORDER BY position',
        id,
      ),
    )
  }

  write(thread: Thread): void {
    this.db
      .prepare(
        `INSERT INTO threads
           (id, type, page, first_line, last_line, selected_text, waits_for, outcome)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           type = excluded.type, page = excluded.page, first_line = excluded.first_line,
           last_line = excluded.last_line, selected_text = excluded.selected_text,
           waits_for = excluded.waits_for, outcome = excluded.outcome`,
      )
      .run(
        thread.id,
        thread.type,
        thread.page,
        thread.anchor?.firstLine ?? null,
        thread.anchor?.lastLine ?? null,
        thread.anchor?.selectedText ?? null,
        thread.waitsFor,
        thread.outcome ?? null,
      )
    this.db.prepare('DELETE FROM messages WHERE thread_id = ?').run(thread.id)
    const insertMessage = this.db.prepare(
      'INSERT INTO messages (thread_id, position, author, text, time) VALUES (?, ?, ?, ?, ?)',
    )
    thread.messages.forEach((message, index) =>
      insertMessage.run(thread.id, index + 1, message.author, message.text, message.time),
    )
  }

  private threadFrom(thread: SavedValues, messages: readonly SavedValues[]): Thread {
    const id = thread.text('id')
    const [first, ...rest] = messages.map((message): Message => ({
      author: message.oneOf('author', authors),
      text: message.text('text'),
      time: message.text('time'),
    }))
    if (first === undefined) {
      throw new BrokenPadDbError(this.padName, `the thread ${id} doesn't have any messages`)
    }
    return {
      id,
      type: thread.oneOf('type', threadTypes),
      page: thread.text('page'),
      anchor: anchorFrom(thread),
      waitsFor: thread.oneOf('waits_for', waitingParties),
      outcome: thread.optionalText('outcome'),
      messages: [first, ...rest],
    }
  }
}

function anchorFrom(thread: SavedValues): Anchor | undefined {
  const firstLine = thread.optionalWholeNumber('first_line')
  return firstLine === undefined
    ? undefined
    : {
        firstLine,
        lastLine: thread.wholeNumber('last_line'),
        selectedText: thread.text('selected_text'),
      }
}

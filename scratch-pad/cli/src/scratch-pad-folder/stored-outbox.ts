import { type DatabaseSync, type SQLInputValue } from 'node:sqlite'
import { type NewQueuedItem, type QueuedItem } from '../outbox/outbox'
import { readSavedValues, type SavedValues } from './saved-values'

export class StoredOutbox {
  constructor(
    private readonly db: DatabaseSync,
    private readonly padName: string,
  ) {}

  read(): QueuedItem[] {
    return readSavedValues(
      this.db,
      this.padName,
      'outbox',
      'SELECT * FROM outbox ORDER BY number',
    ).map(queuedItemFrom)
  }

  save(item: NewQueuedItem): QueuedItem {
    const { lastInsertRowid } = this.db
      .prepare(
        `INSERT INTO outbox
           (time, text, thread_id, page, first_line, last_line, selected_text, prefix, suffix,
            copies_on_page)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(item.time, item.text, ...placeColumns(item))
    return { number: Number(lastInsertRowid), ...item }
  }

  updateText(item: QueuedItem): void {
    this.db.prepare('UPDATE outbox SET text = ? WHERE number = ?').run(item.text, item.number)
  }

  delete(number: number): void {
    this.db.prepare('DELETE FROM outbox WHERE number = ?').run(number)
  }
}

// A reply only has its thread, whereas a comment has its page and its anchor.
function placeColumns(item: NewQueuedItem): SQLInputValue[] {
  if (item.kind === 'reply') {
    return [item.thread, null, null, null, null, null, null, null]
  }
  const { anchor } = item
  return [
    null,
    item.page,
    anchor.firstLine,
    anchor.lastLine,
    anchor.selectedText,
    anchor.prefix ?? null,
    anchor.suffix ?? null,
    anchor.copiesOnPage ?? null,
  ]
}

function queuedItemFrom(item: SavedValues): QueuedItem {
  const number = item.wholeNumber('number')
  const text = item.text('text')
  const time = item.text('time')
  const thread = item.optionalText('thread_id')
  if (thread !== undefined) {
    return { kind: 'reply', number, thread, text, time }
  }
  const copiesOnPage = item.optionalWholeNumber('copies_on_page')
  return {
    kind: 'comment',
    number,
    page: item.text('page'),
    anchor: {
      firstLine: item.wholeNumber('first_line'),
      lastLine: item.wholeNumber('last_line'),
      selectedText: item.text('selected_text'),
      prefix: item.optionalText('prefix'),
      suffix: item.optionalText('suffix'),
      ...(copiesOnPage === undefined ? {} : { copiesOnPage }),
    },
    text,
    time,
  }
}

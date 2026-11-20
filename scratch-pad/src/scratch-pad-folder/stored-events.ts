import { type DatabaseSync } from 'node:sqlite'
import { eventKinds, type NewEvent, type ScratchPadEvent } from '../events/scratch-pad-event'
import { authors } from '../threads/thread'
import { readSavedValues } from './saved-values'

export class StoredEvents {
  constructor(
    private readonly db: DatabaseSync,
    private readonly padName: string,
  ) {}

  read(): ScratchPadEvent[] {
    return readSavedValues(
      this.db,
      this.padName,
      'events',
      'SELECT number, time, kind, author, item FROM events ORDER BY number',
    ).map((event) => ({
      number: event.wholeNumber('number'),
      time: event.text('time'),
      kind: event.oneOf('kind', eventKinds),
      by: event.oneOf('author', authors),
      item: event.optionalText('item'),
    }))
  }

  append(event: NewEvent): ScratchPadEvent {
    const appended = this.db
      .prepare('INSERT INTO events (time, kind, author, item) VALUES (?, ?, ?, ?)')
      .run(event.time, event.kind, event.by, event.item ?? null)
    return { number: Number(appended.lastInsertRowid), ...event }
  }
}

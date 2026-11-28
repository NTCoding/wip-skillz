import { type DatabaseSync, type SQLInputValue } from 'node:sqlite'
import {
  type NewQueuedItem,
  type QueuedComment,
  type QueuedItem,
  type QueuedReply,
} from '../outbox/outbox'
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
            copies_on_page, decision_id, decision_line, decision_question, decision_choice,
            decision_written, decision_option)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(item.time, ...itemColumns(item))
    return { number: Number(lastInsertRowid), ...item }
  }

  updateText(item: QueuedComment | QueuedReply): void {
    this.db.prepare('UPDATE outbox SET text = ? WHERE number = ?').run(item.text, item.number)
  }

  delete(number: number): void {
    this.db.prepare('DELETE FROM outbox WHERE number = ?').run(number)
  }
}

// A reply has its thread, a comment has its page and anchor, and a decision has its decision fields.
function itemColumns(item: NewQueuedItem): SQLInputValue[] {
  if (item.kind === 'reply') {
    return [
      item.text,
      item.thread,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ]
  }
  if (item.kind === 'decision') {
    const choice = 'choice' in item.answer ? item.answer.choice : null
    const written = 'written' in item.answer ? item.answer.written : null
    return [
      null,
      null,
      item.page,
      null,
      null,
      null,
      null,
      null,
      null,
      item.decision,
      item.line,
      item.question,
      choice,
      written,
      item.chosenOption ?? null,
    ]
  }
  const { anchor } = item
  return [
    item.text,
    null,
    item.page,
    anchor.firstLine,
    anchor.lastLine,
    anchor.selectedText,
    anchor.prefix ?? null,
    anchor.suffix ?? null,
    anchor.copiesOnPage ?? null,
    null,
    null,
    null,
    null,
    null,
    null,
  ]
}

function queuedItemFrom(item: SavedValues): QueuedItem {
  const number = item.wholeNumber('number')
  const time = item.text('time')
  const decision = item.optionalText('decision_id')
  if (decision !== undefined) {
    const choice = item.optionalText('decision_choice')
    const chosenOption = item.optionalText('decision_option')
    return {
      kind: 'decision',
      number,
      decision,
      page: item.text('page'),
      line: item.wholeNumber('decision_line'),
      question: item.text('decision_question'),
      answer: choice === undefined ? { written: item.text('decision_written') } : { choice },
      ...(chosenOption === undefined ? {} : { chosenOption }),
      time,
    }
  }
  const text = item.text('text')
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

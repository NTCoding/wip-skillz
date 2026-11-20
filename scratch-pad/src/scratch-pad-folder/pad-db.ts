import { type DatabaseSync, type SQLInputValue } from 'node:sqlite'
import { type LastPrintedEvents } from '../agent-inbox/agent-inbox'
import { type Answer, type DecisionAnswer } from '../decisions/decision-answer'
import { decisionSources, type DecisionLogEntry } from '../decisions/decision-log'
import { eventKinds, type NewEvent, type ScratchPadEvent } from '../events/scratch-pad-event'
import { itemTypeOf, itemTypes, type ItemType } from '../items/item-id'
import { taskStates, type ProgressTracker, type Task } from '../progress-tracker/progress-tracker'
import { ScratchPadError } from '../scratch-pad-error'
import {
  authors,
  threadTypes,
  waitingParties,
  type Anchor,
  type Message,
  type Thread,
} from '../threads/thread'
import { BrokenPadDbError, PadRow } from './pad-row'

export class UnknownThreadError extends ScratchPadError {
  constructor(id: string, type: ItemType, padName: string) {
    super(
      `There isn't any thread called ${id} in ${padName}. Run "scratch-pad inbox --all --type ${type}" to list the threads that wait for the agent.`,
    )
  }
}

export class UnknownDecisionError extends ScratchPadError {
  constructor(id: string, padName: string) {
    super(`There isn't any answered decision called ${id} in ${padName}.`)
  }
}

export class PadDb {
  constructor(
    private readonly db: DatabaseSync,
    private readonly padName: string,
  ) {}

  readProgressTracker(): ProgressTracker {
    const [tracker] = this.rows('progress_tracker', 'SELECT title, goal FROM progress_tracker')
    if (tracker === undefined) {
      throw new BrokenPadDbError(this.padName, "the table progress_tracker doesn't have any rows")
    }
    return {
      title: tracker.text('title'),
      goal: tracker.optionalText('goal'),
      tasks: this.rows('tasks', 'SELECT number, title, state FROM tasks ORDER BY number').map(
        (task): Task => ({
          number: task.wholeNumber('number'),
          title: task.text('title'),
          state: task.oneOf('state', taskStates),
        }),
      ),
    }
  }

  writeProgressTracker(tracker: ProgressTracker): void {
    this.run(
      `INSERT INTO progress_tracker (id, title, goal) VALUES (1, ?, ?)
       ON CONFLICT (id) DO UPDATE SET title = excluded.title, goal = excluded.goal`,
      tracker.title,
      tracker.goal ?? null,
    )
    this.run('DELETE FROM tasks')
    tracker.tasks.forEach((task) =>
      this.run(
        'INSERT INTO tasks (number, title, state) VALUES (?, ?, ?)',
        task.number,
        task.title,
        task.state,
      ),
    )
  }

  readThreads(): Thread[] {
    const messages = this.rows(
      'messages',
      'SELECT thread_id, author, text, time FROM messages ORDER BY thread_id, position',
    )
    return this.rows('threads', 'SELECT * FROM threads')
      .map((thread) =>
        this.threadFrom(
          thread,
          messages.filter((message) => message.text('thread_id') === thread.text('id')),
        ),
      )
      .toSorted((first, second) => byItemNumber(first.id, second.id))
  }

  readThread(id: string): Thread {
    const type = itemTypeOf(id)
    const [thread] = this.rows('threads', 'SELECT * FROM threads WHERE id = ?', id)
    if (thread === undefined) {
      throw new UnknownThreadError(id, type, this.padName)
    }
    return this.threadFrom(
      thread,
      this.rows(
        'messages',
        'SELECT author, text, time FROM messages WHERE thread_id = ? ORDER BY position',
        id,
      ),
    )
  }

  writeThread(thread: Thread): void {
    this.run(
      `INSERT INTO threads
         (id, type, page, first_line, last_line, selected_text, waits_for, outcome)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         type = excluded.type, page = excluded.page, first_line = excluded.first_line,
         last_line = excluded.last_line, selected_text = excluded.selected_text,
         waits_for = excluded.waits_for, outcome = excluded.outcome`,
      thread.id,
      thread.type,
      thread.page,
      thread.anchor?.firstLine ?? null,
      thread.anchor?.lastLine ?? null,
      thread.anchor?.selectedText ?? null,
      thread.waitsFor,
      thread.outcome ?? null,
    )
    this.run('DELETE FROM messages WHERE thread_id = ?', thread.id)
    thread.messages.forEach((message, index) =>
      this.run(
        'INSERT INTO messages (thread_id, position, author, text, time) VALUES (?, ?, ?, ?, ?)',
        thread.id,
        index + 1,
        message.author,
        message.text,
        message.time,
      ),
    )
  }

  readDecisionAnswers(): DecisionAnswer[] {
    return this.rows('decisions', 'SELECT * FROM decisions')
      .map((decision) => this.decisionFrom(decision))
      .toSorted((first, second) => byItemNumber(first.id, second.id))
  }

  readDecisionAnswer(id: string): DecisionAnswer {
    itemTypeOf(id)
    const [decision] = this.rows('decisions', 'SELECT * FROM decisions WHERE id = ?', id)
    if (decision === undefined) {
      throw new UnknownDecisionError(id, this.padName)
    }
    return this.decisionFrom(decision)
  }

  writeDecisionAnswer(decision: DecisionAnswer): void {
    this.run(
      `INSERT INTO decisions
         (id, page, line, question, choice, written_answer, seen_by_agent, time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         page = excluded.page, line = excluded.line, question = excluded.question,
         choice = excluded.choice, written_answer = excluded.written_answer,
         seen_by_agent = excluded.seen_by_agent, time = excluded.time`,
      decision.id,
      decision.page,
      decision.line,
      decision.question,
      'choice' in decision.answer ? decision.answer.choice : null,
      'written' in decision.answer ? decision.answer.written : null,
      decision.seenByAgent ? 1 : 0,
      decision.time,
    )
  }

  readEvents(): ScratchPadEvent[] {
    return this.rows(
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

  appendEvent(event: NewEvent): ScratchPadEvent {
    const appended = this.db
      .prepare('INSERT INTO events (time, kind, author, item) VALUES (?, ?, ?, ?)')
      .run(event.time, event.kind, event.by, event.item ?? null)
    return { number: Number(appended.lastInsertRowid), ...event }
  }

  readDecisionLog(): DecisionLogEntry[] {
    return this.rows(
      'decision_log',
      'SELECT number, time, source, text, decision_id FROM decision_log ORDER BY number',
    ).map((entry) => ({
      number: entry.wholeNumber('number'),
      time: entry.text('time'),
      source: entry.oneOf('source', decisionSources),
      text: entry.text('text'),
      decision: entry.optionalText('decision_id'),
    }))
  }

  saveDecisionLogEntry(entry: DecisionLogEntry): void {
    this.run(
      `INSERT INTO decision_log (number, time, source, text, decision_id) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (number) DO UPDATE SET
         time = excluded.time, source = excluded.source, text = excluded.text,
         decision_id = excluded.decision_id`,
      entry.number,
      entry.time,
      entry.source,
      entry.text,
      entry.decision ?? null,
    )
  }

  readLastPrintedEvents(): LastPrintedEvents {
    const stored = new Map(
      this.rows('agent_inbox', 'SELECT item_type, last_printed_event FROM agent_inbox').map(
        (row) => [row.oneOf('item_type', itemTypes), row.wholeNumber('last_printed_event')],
      ),
    )
    return {
      comment: stored.get('comment') ?? 0,
      decision: stored.get('decision') ?? 0,
      grammar: stored.get('grammar') ?? 0,
      improvement: stored.get('improvement') ?? 0,
    }
  }

  writeLastPrintedEvents(lastPrinted: LastPrintedEvents): void {
    itemTypes.forEach((type) =>
      this.run(
        `INSERT INTO agent_inbox (item_type, last_printed_event) VALUES (?, ?)
         ON CONFLICT (item_type) DO UPDATE SET last_printed_event = excluded.last_printed_event`,
        type,
        lastPrinted[type],
      ),
    )
  }

  private threadFrom(thread: PadRow, messages: readonly PadRow[]): Thread {
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

  private decisionFrom(decision: PadRow): DecisionAnswer {
    return {
      id: decision.text('id'),
      page: decision.text('page'),
      line: decision.wholeNumber('line'),
      question: decision.text('question'),
      answer: answerFrom(decision),
      seenByAgent: decision.flag('seen_by_agent'),
      time: decision.text('time'),
    }
  }

  private rows(table: string, sql: string, ...values: SQLInputValue[]): PadRow[] {
    return this.db
      .prepare(sql)
      .all(...values)
      .map((row) => new PadRow(row, table, this.padName))
  }

  private run(sql: string, ...values: SQLInputValue[]): void {
    this.db.prepare(sql).run(...values)
  }
}

function anchorFrom(thread: PadRow): Anchor | undefined {
  const firstLine = thread.optionalWholeNumber('first_line')
  return firstLine === undefined
    ? undefined
    : {
        firstLine,
        lastLine: thread.wholeNumber('last_line'),
        selectedText: thread.text('selected_text'),
      }
}

function answerFrom(decision: PadRow): Answer {
  const choice = decision.optionalText('choice')
  return choice === undefined ? { written: decision.text('written_answer') } : { choice }
}

function byItemNumber(first: string, second: string): number {
  return first.localeCompare(second, 'en', { numeric: true })
}

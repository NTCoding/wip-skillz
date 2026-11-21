import { type DatabaseSync } from 'node:sqlite'
import { decisionSources, type DecisionLogEntry } from '../decisions/decision-log'
import { readSavedValues } from './saved-values'

export class StoredDecisionLog {
  constructor(
    private readonly db: DatabaseSync,
    private readonly padName: string,
  ) {}

  read(): DecisionLogEntry[] {
    return readSavedValues(
      this.db,
      this.padName,
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

  save(entry: DecisionLogEntry): void {
    this.db
      .prepare(
        `INSERT INTO decision_log (number, time, source, text, decision_id) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (number) DO UPDATE SET
           time = excluded.time, source = excluded.source, text = excluded.text,
           decision_id = excluded.decision_id`,
      )
      .run(entry.number, entry.time, entry.source, entry.text, entry.decision ?? null)
  }
}

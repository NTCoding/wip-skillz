import { type DatabaseSync } from 'node:sqlite'
import { type Improvement, type NewImprovement } from '../improvements/improvements'
import { readSavedValues } from './saved-values'

export class StoredImprovements {
  constructor(
    private readonly db: DatabaseSync,
    private readonly padName: string,
  ) {}

  read(): Improvement[] {
    return readSavedValues(
      this.db,
      this.padName,
      'improvements',
      'SELECT number, time, title, details FROM improvements ORDER BY number',
    ).map((improvement) => ({
      number: improvement.wholeNumber('number'),
      time: improvement.text('time'),
      title: improvement.text('title'),
      details: improvement.optionalText('details'),
    }))
  }

  save(improvement: NewImprovement): Improvement {
    const { lastInsertRowid } = this.db
      .prepare('INSERT INTO improvements (time, title, details) VALUES (?, ?, ?)')
      .run(improvement.time, improvement.title, improvement.details ?? null)
    return { number: Number(lastInsertRowid), ...improvement }
  }

  update(improvement: Improvement): void {
    this.db
      .prepare('UPDATE improvements SET title = ?, details = ? WHERE number = ?')
      .run(improvement.title, improvement.details ?? null, improvement.number)
  }

  delete(number: number): void {
    this.db.prepare('DELETE FROM improvements WHERE number = ?').run(number)
  }
}

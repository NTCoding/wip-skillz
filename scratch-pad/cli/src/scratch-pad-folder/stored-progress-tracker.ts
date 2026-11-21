import { type DatabaseSync } from 'node:sqlite'
import { taskStates, type ProgressTracker, type Task } from '../progress-tracker/progress-tracker'
import { BrokenPadDbError } from './pad-db-errors'
import { readSavedValues } from './saved-values'

export class StoredProgressTracker {
  constructor(
    private readonly db: DatabaseSync,
    private readonly padName: string,
  ) {}

  read(): ProgressTracker {
    const [tracker] = readSavedValues(
      this.db,
      this.padName,
      'progress_tracker',
      'SELECT title, goal FROM progress_tracker',
    )
    if (tracker === undefined) {
      throw new BrokenPadDbError(this.padName, "the table progress_tracker doesn't have any rows")
    }
    return {
      title: tracker.text('title'),
      goal: tracker.optionalText('goal'),
      tasks: readSavedValues(
        this.db,
        this.padName,
        'tasks',
        'SELECT number, title, state FROM tasks ORDER BY number',
      ).map((task): Task => ({
        number: task.wholeNumber('number'),
        title: task.text('title'),
        state: task.oneOf('state', taskStates),
      })),
    }
  }

  write(tracker: ProgressTracker): void {
    this.db
      .prepare(
        `INSERT INTO progress_tracker (id, title, goal) VALUES (1, ?, ?)
         ON CONFLICT (id) DO UPDATE SET title = excluded.title, goal = excluded.goal`,
      )
      .run(tracker.title, tracker.goal ?? null)
    this.db.prepare('DELETE FROM tasks').run()
    const insertTask = this.db.prepare('INSERT INTO tasks (number, title, state) VALUES (?, ?, ?)')
    tracker.tasks.forEach((task) => insertTask.run(task.number, task.title, task.state))
  }
}

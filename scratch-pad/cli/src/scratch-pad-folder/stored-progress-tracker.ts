import { type DatabaseSync } from 'node:sqlite'
import {
  assignees,
  ordered,
  taskStates,
  type Assignment,
  type ProgressTracker,
  type Subtask,
  type Task,
  type TrackerItem,
} from '../progress-tracker/progress-tracker'
import { BrokenPadDbError } from './pad-db-errors'
import { readSavedValues, type SavedValues } from './saved-values'

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
    const rows = readSavedValues(
      this.db,
      this.padName,
      'tasks',
      `SELECT id, parent_id, position, title, state, description, assignee, assignment_do,
         assignment_why
       FROM tasks ORDER BY position`,
    )
    const subtasksOf = (id: string): Subtask[] =>
      rows
        .filter((row) => row.optionalText('parent_id') === id)
        .map((row) => ({ ...fieldsOf(row), number: String(row.wholeNumber('position')) }))
    return ordered({
      title: tracker.text('title'),
      goal: tracker.optionalText('goal'),
      tasks: rows
        .filter((row) => row.optionalText('parent_id') === undefined)
        .map((row): Task => {
          const fields = fieldsOf(row)
          return {
            ...fields,
            number: row.wholeNumber('position'),
            subtasks: subtasksOf(fields.id),
          }
        }),
    })
  }

  // Each task is written before its subtasks. The position of a task or a subtask is its place
  // among the tasks or among the subtasks of its task.
  write(tracker: ProgressTracker): void {
    this.db
      .prepare(
        `INSERT INTO progress_tracker (id, title, goal) VALUES (1, ?, ?)
         ON CONFLICT (id) DO UPDATE SET title = excluded.title, goal = excluded.goal`,
      )
      .run(tracker.title, tracker.goal ?? null)
    this.db.prepare('DELETE FROM tasks').run()
    const insertTask = this.db.prepare(
      `INSERT INTO tasks (id, parent_id, position, title, state, description, assignee,
         assignment_do, assignment_why)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    const insert = (item: TrackerItem, parentId: string | null, position: number): void => {
      insertTask.run(
        item.id,
        parentId,
        position,
        item.title,
        item.state,
        item.description ?? null,
        item.assignment?.assignee ?? null,
        item.assignment?.do ?? null,
        item.assignment?.why ?? null,
      )
    }
    tracker.tasks.forEach((task, index) => {
      insert(task, null, index + 1)
      task.subtasks.forEach((subtask, position) => insert(subtask, task.id, position + 1))
    })
  }
}

function fieldsOf(row: SavedValues) {
  return {
    id: row.text('id'),
    title: row.text('title'),
    state: row.oneOf('state', taskStates),
    description: row.optionalText('description'),
    assignment: assignmentOf(row),
  }
}

function assignmentOf(row: SavedValues): Assignment | undefined {
  return row.optionalText('assignee') === undefined
    ? undefined
    : {
        assignee: row.oneOf('assignee', assignees),
        do: row.text('assignment_do'),
        why: row.text('assignment_why'),
      }
}

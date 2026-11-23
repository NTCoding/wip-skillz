import { TaskLink } from '../task-link/task-link'
import { TaskStateLabel, type TaskState } from '../task-state-label/task-state-label'
import { type Navigate } from '../../navigation-click'
import './task-chips.css'

export interface TaskChipRow {
  readonly id: string
  // The number and the title of the task, like "2.1 Retry a failed export"
  readonly label: string
  readonly href: string
  readonly state: TaskState
}

interface TaskChipsProps {
  readonly tasks: readonly TaskChipRow[]
  readonly onNavigate: Navigate
}

// The line at the top of a page for each task or subtask that the page is part of
export function TaskChips({ tasks, onNavigate }: TaskChipsProps) {
  return (
    <ul className="task-chips" aria-label="Tasks">
      {tasks.map((task) => (
        <li key={task.id} className="task-chips__chip">
          <span className="task-chips__label">Part of task</span>
          <TaskLink href={task.href} onNavigate={onNavigate}>
            {task.label}
          </TaskLink>
          <TaskStateLabel state={task.state} />
        </li>
      ))}
    </ul>
  )
}

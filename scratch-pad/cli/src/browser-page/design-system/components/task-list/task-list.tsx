import './task-list.css'

export type TaskState = 'to-do' | 'in-progress' | 'done'

export interface TaskRow {
  readonly number: number
  readonly title: string
  readonly state: TaskState
}

interface TaskListProps {
  readonly tasks: readonly TaskRow[]
}

const stateLabels: Readonly<Record<TaskState, string>> = {
  'to-do': 'To do',
  'in-progress': 'In progress',
  done: 'Done',
}

export function TaskList({ tasks }: TaskListProps) {
  return (
    <ol className="task-list">
      {tasks.map((task) => (
        <li key={task.number} className="task-list__task" data-state={task.state}>
          <span className="task-list__number">{task.number}</span>
          <span className="task-list__title">{task.title}</span>
          <span className="task-list__state">{stateLabels[task.state]}</span>
        </li>
      ))}
    </ol>
  )
}

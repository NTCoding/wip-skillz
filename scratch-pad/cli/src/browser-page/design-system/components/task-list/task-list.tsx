import { useState } from 'react'
import { Icon } from '../icon/icon'
import { TaskStateLabel, type TaskState } from '../task-state-label/task-state-label'
import { navigationClick, type Navigate } from '../../navigation-click'
import './task-list.css'

export interface SubtaskRow {
  // The id of the task, like t-4
  readonly id: string
  // The number of the task, like 2 or 2.1
  readonly number: string
  readonly title: string
  readonly state: TaskState
  // The address of the task's description. A task without a description doesn't have one, so its
  // title isn't a link.
  readonly href?: string | undefined
  // Whether the row has the id of the task as its anchor. A link to a task without a description
  // points to its row.
  readonly anchor?: boolean
}

export interface TaskRow extends SubtaskRow {
  readonly subtasks?: readonly SubtaskRow[]
}

interface TaskListProps {
  readonly tasks: readonly TaskRow[]
  readonly onNavigate?: Navigate | undefined
  // The id of the task or the subtask that a link points to. The subtasks of its task are shown.
  readonly openTask?: string | undefined
  // A new value every time Nick follows a link. The chevrons that Nick has clicked are forgotten
  // then, so the subtasks that a link points to are shown even if Nick had hidden them.
  readonly openRequest?: number
}

function TaskTitle({
  task,
  onNavigate,
}: {
  readonly task: SubtaskRow
  readonly onNavigate?: Navigate | undefined
}) {
  if (task.href === undefined) {
    return <span className="task-list__title">{task.title}</span>
  }
  return (
    <a
      className="task-list__title"
      href={task.href}
      onClick={onNavigate === undefined ? undefined : navigationClick(task.href, onNavigate)}
    >
      {task.title}
    </a>
  )
}

function RowCells({
  task,
  onNavigate,
}: {
  readonly task: SubtaskRow
  readonly onNavigate?: Navigate | undefined
}) {
  return (
    <>
      <span className="task-list__number">{task.number}</span>
      <TaskTitle task={task} onNavigate={onNavigate} />
      <span className="task-list__state">
        <TaskStateLabel state={task.state} />
      </span>
    </>
  )
}

// A task with subtasks shows them when it's in progress, when a link points to one of them or
// when Nick has opened them with the chevron.
function shownAtFirst(task: TaskRow, openTask: string | undefined): boolean {
  return (
    task.state === 'in-progress' || (task.subtasks ?? []).some((subtask) => subtask.id === openTask)
  )
}

interface Toggles {
  readonly openRequest: number | undefined
  readonly open: ReadonlyMap<string, boolean>
}

export function TaskList({ tasks, onNavigate, openTask, openRequest }: TaskListProps) {
  const [toggles, setToggles] = useState<Toggles>({ openRequest, open: new Map() })
  const toggled = toggles.openRequest === openRequest ? toggles.open : new Map<string, boolean>()
  return (
    <ol className="task-list">
      {tasks.map((task) => {
        const subtasks = task.subtasks ?? []
        const open = toggled.get(task.id) ?? shownAtFirst(task, openTask)
        return (
          <li key={task.id} className="task-list__item">
            <div
              className="task-list__task"
              id={task.anchor === true ? task.id : undefined}
              data-state={task.state}
            >
              {subtasks.length === 0 ? (
                <span className="task-list__chevron" />
              ) : (
                <button
                  type="button"
                  className="task-list__chevron"
                  aria-expanded={open}
                  aria-label={`Subtasks of task ${task.number}`}
                  onClick={() =>
                    setToggles({ openRequest, open: new Map([...toggled, [task.id, !open]]) })
                  }
                >
                  <Icon name="chevron" />
                </button>
              )}
              <RowCells task={task} onNavigate={onNavigate} />
            </div>
            {open && subtasks.length > 0 && (
              <ol className="task-list__subtasks">
                {subtasks.map((subtask) => (
                  <li
                    key={subtask.id}
                    className="task-list__task task-list__task--subtask"
                    id={subtask.anchor === true ? subtask.id : undefined}
                    data-state={subtask.state}
                  >
                    <RowCells task={subtask} onNavigate={onNavigate} />
                  </li>
                ))}
              </ol>
            )}
          </li>
        )
      })}
    </ol>
  )
}

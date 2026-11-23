import { useState } from 'react'
import { Icon } from '../icon/icon'
import { TaskStateLabel, type TaskState } from '../task-state-label/task-state-label'
import { navigationClick, type Navigate } from '../../navigation-click'
import './task-list.css'

// What Nick has to do and why the agent can't do the task. Only a task or a subtask that is
// assigned to Nick has an assignment.
export interface RowAssignment {
  readonly do: string
  readonly why: string
  // The address of the description below the list. An item without a description doesn't have one.
  readonly descriptionHref: string | undefined
}

export interface SubtaskRow {
  // The id of the task, like t-4
  readonly id: string
  // The number of the task. A subtask has a number like 2.1.
  readonly number: string
  readonly title: string
  readonly state: TaskState
  // The address of the task's description. A task without a description doesn't have one so its
  // title isn't a link. The title of an assigned task is never a link, because its row is a button.
  readonly href?: string | undefined
  // Whether the row has the id of the task as its anchor. A link to a task without a description
  // points to its row. A link to an assigned task points to its row too.
  readonly anchor?: boolean
  readonly assignment?: RowAssignment | undefined
}

export interface TaskRow extends SubtaskRow {
  readonly subtasks?: readonly SubtaskRow[]
}

interface TaskListProps {
  readonly tasks: readonly TaskRow[]
  readonly onNavigate?: Navigate | undefined
  // The id of the task or the subtask that a link points to. The subtasks of its task are shown.
  // A link to an assigned task or subtask opens the details of that row.
  readonly openTask?: string | undefined
  // A new value every time Nick follows a link. The chevrons that Nick has clicked are forgotten
  // then so the subtasks that a link points to are shown even if Nick had hidden them.
  readonly openRequest?: number
}

function TaskTitle({
  task,
  onNavigate,
}: {
  readonly task: SubtaskRow
  readonly onNavigate?: Navigate | undefined
}) {
  if (task.href === undefined || task.assignment !== undefined) {
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

// The mark of a row that is assigned to Nick is a dark disc that contains a person. The small dot
// on a task shows that some of its subtasks are assigned to Nick. The mark and the dot of a task
// that is done are grey. A row without a mark doesn't have an element for the mark so that its
// title can take the column of the mark in a narrow list.
function AssignedMark({ task }: { readonly task: TaskRow }) {
  const assignedSubtasks = (task.subtasks ?? []).filter(
    (subtask) => subtask.assignment !== undefined,
  ).length
  if (task.assignment !== undefined) {
    return (
      <span
        className="task-list__mark"
        role="img"
        aria-label="Assigned to you"
        title="Assigned to you"
      >
        <svg className="task-list__assigned" viewBox="0 0 16 16" aria-hidden="true">
          <circle className="task-list__assigned-disc" cx="8" cy="8" r="8" />
          <circle className="task-list__assigned-person" cx="8" cy="6" r="2.1" />
          <path className="task-list__assigned-person" d="M4.5 12.3a3.5 3.5 0 0 1 7 0" />
        </svg>
      </span>
    )
  }
  if (assignedSubtasks === 0) {
    return null
  }
  const label =
    assignedSubtasks === 1
      ? 'A subtask of this task is assigned to you'
      : 'Subtasks of this task are assigned to you'
  return (
    <span className="task-list__mark" role="img" aria-label={label} title={label}>
      <span className="task-list__assigned-dot" />
    </span>
  )
}

interface RowCellsProps {
  readonly task: TaskRow
  readonly onNavigate?: Navigate | undefined
  // A list with tasks that are assigned to Nick has a column for the mark in every row.
  readonly marks: boolean
}

function RowCells({ task, onNavigate, marks }: RowCellsProps) {
  return (
    <>
      <span className="task-list__number">{task.number}</span>
      <TaskTitle task={task} onNavigate={onNavigate} />
      <span className="task-list__state">
        <TaskStateLabel state={task.state} />
      </span>
      {marks && <AssignedMark task={task} />}
    </>
  )
}

// The text of what Nick has to do or of why the agent can't do the task. A blank line starts a new
// paragraph.
function Paragraphs({ text }: { readonly text: string }) {
  return text.split(/\n\s*\n/u).map((paragraph, index) => (
    <p key={`${String(index)} ${paragraph}`} className="task-list__text">
      {paragraph}
    </p>
  ))
}

interface DetailsProps {
  readonly id: string
  readonly kind: 'task' | 'subtask'
  readonly assignment: RowAssignment
  readonly onNavigate?: Navigate | undefined
}

// The details of a task that is assigned to Nick. They link to the description of the task below
// the list.
function Details({ id, kind, assignment, onNavigate }: DetailsProps) {
  const { descriptionHref } = assignment
  return (
    <div className="task-list__details" id={id}>
      <section className="task-list__part">
        <p className="task-list__label">What you need to do</p>
        <Paragraphs text={assignment.do} />
      </section>
      <section className="task-list__part">
        <p className="task-list__label">Why the agent can’t do the {kind}</p>
        <Paragraphs text={assignment.why} />
      </section>
      {descriptionHref !== undefined && (
        <p className="task-list__part">
          <a
            className="task-list__description-link"
            href={descriptionHref}
            onClick={
              onNavigate === undefined ? undefined : navigationClick(descriptionHref, onNavigate)
            }
          >
            Read the description
            <Icon name="chevron" />
          </a>
        </p>
      )}
    </div>
  )
}

interface RowProps {
  readonly task: TaskRow
  readonly subtask: boolean
  readonly open: boolean
  readonly onToggle: () => void
  readonly onNavigate?: Navigate | undefined
  readonly marks: boolean
}

// The row of an assigned task with subtasks opens its details and subtasks together. That's why the
// row points at both of them.
function controlledIds(task: TaskRow): string {
  return (task.subtasks ?? []).length === 0
    ? `${task.id}-details`
    : `${task.id}-details ${task.id}-subtasks`
}

// Nick clicks the row of an assigned task to open or close its details. A task with subtasks has a
// chevron instead. The subtasks are shown or hidden by a click on that chevron.
function Row({ task, subtask, open, onToggle, onNavigate, marks }: RowProps) {
  const className = subtask ? 'task-list__task task-list__task--subtask' : 'task-list__task'
  const id = task.anchor === true ? task.id : undefined
  const subtasks = task.subtasks ?? []
  if (task.assignment !== undefined) {
    return (
      <button
        type="button"
        className={className}
        id={id}
        data-state={task.state}
        aria-expanded={open}
        aria-controls={open ? controlledIds(task) : undefined}
        onClick={onToggle}
      >
        <span className="task-list__chevron">
          <Icon name="chevron" />
        </span>
        <RowCells task={task} onNavigate={onNavigate} marks={marks} />
      </button>
    )
  }
  return (
    <div className={className} id={id} data-state={task.state}>
      {subtasks.length === 0 ? (
        <span className="task-list__chevron" />
      ) : (
        <button
          type="button"
          className="task-list__chevron"
          aria-expanded={open}
          aria-label={`Subtasks of task ${task.number}`}
          onClick={onToggle}
        >
          <Icon name="chevron" />
        </button>
      )}
      <RowCells task={task} onNavigate={onNavigate} marks={marks} />
    </div>
  )
}

// The subtasks of a task in progress are open until Nick closes them. The subtasks of any other
// task will be opened if a link points to one of them. The details of an assigned task will be
// opened if a link points to that task.
function shownAtFirst(task: TaskRow, openTask: string | undefined): boolean {
  const subtasks = task.subtasks ?? []
  const pointedTo = task.assignment !== undefined && task.id === openTask
  return (
    pointedTo ||
    (subtasks.length > 0 &&
      (task.state === 'in-progress' || subtasks.some((subtask) => subtask.id === openTask)))
  )
}

function hasMarks(tasks: readonly TaskRow[]): boolean {
  return tasks.some((task) =>
    [task, ...(task.subtasks ?? [])].some((row) => row.assignment !== undefined),
  )
}

interface Toggles {
  readonly openRequest: number | undefined
  readonly open: ReadonlyMap<string, boolean>
}

export function TaskList({ tasks, onNavigate, openTask, openRequest }: TaskListProps) {
  const [toggles, setToggles] = useState<Toggles>({ openRequest, open: new Map() })
  const toggled = toggles.openRequest === openRequest ? toggles.open : new Map<string, boolean>()
  const marks = hasMarks(tasks)
  const isOpen = (task: TaskRow): boolean => toggled.get(task.id) ?? shownAtFirst(task, openTask)
  const toggle = (task: TaskRow) => (): void => {
    setToggles({ openRequest, open: new Map([...toggled, [task.id, !isOpen(task)]]) })
  }
  return (
    <ol className="task-list" data-marks={marks}>
      {tasks.map((task) => {
        const subtasks = task.subtasks ?? []
        const open = isOpen(task)
        return (
          <li
            key={task.id}
            className="task-list__item"
            data-open={task.assignment !== undefined && open}
          >
            <Row
              task={task}
              subtask={false}
              open={open}
              onToggle={toggle(task)}
              onNavigate={onNavigate}
              marks={marks}
            />
            {open && task.assignment !== undefined && (
              <Details
                id={`${task.id}-details`}
                kind="task"
                assignment={task.assignment}
                onNavigate={onNavigate}
              />
            )}
            {open && subtasks.length > 0 && (
              <ol className="task-list__subtasks" id={`${task.id}-subtasks`}>
                {subtasks.map((subtask) => {
                  const subtaskOpen = isOpen(subtask)
                  return (
                    <li
                      key={subtask.id}
                      className="task-list__subtask"
                      data-open={subtask.assignment !== undefined && subtaskOpen}
                    >
                      <Row
                        task={subtask}
                        subtask={true}
                        open={subtaskOpen}
                        onToggle={toggle(subtask)}
                        onNavigate={onNavigate}
                        marks={marks}
                      />
                      {subtaskOpen && subtask.assignment !== undefined && (
                        <Details
                          id={`${subtask.id}-details`}
                          kind="subtask"
                          assignment={subtask.assignment}
                          onNavigate={onNavigate}
                        />
                      )}
                    </li>
                  )
                })}
              </ol>
            )}
          </li>
        )
      })}
    </ol>
  )
}

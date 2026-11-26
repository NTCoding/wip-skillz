import { useState, type ReactNode } from 'react'
import { Icon } from '../icon/icon'
import { TaskStateLabel, type TaskState } from '../task-state-label/task-state-label'
import { navigationClick, type Navigate } from '../../navigation-click'
import './task-list.css'

// What Nick has to do and why the agent can't do the task. Only a task or a subtask that is
// assigned to Nick has an assignment. Each text is a list of paragraphs, which can contain links.
export interface RowAssignment {
  readonly do: ReactNode
  readonly why: ReactNode
  // The address of the description below the list. An item without a description doesn't have one.
  readonly descriptionHref: string | undefined
}

// The thread of a task or a subtask that is assigned to Nick. Nick opens it below the row with the
// speech bubble on the row.
export interface RowThread {
  // The id of the thread, like c-4, which a link to the thread points to. A task without a thread
  // doesn't have one yet.
  readonly id: string | undefined
  // The card of the thread, or the box for its first message. close closes the thread below the
  // row.
  readonly content: (close: () => void) => ReactNode
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
  readonly thread?: RowThread | undefined
}

export interface TaskRow extends SubtaskRow {
  readonly subtasks?: readonly SubtaskRow[]
}

interface TaskListProps {
  readonly tasks: readonly TaskRow[]
  readonly onNavigate?: Navigate | undefined
  // The id of the task or the subtask that a link points to. The subtasks of its task are shown.
  // A link to an assigned task or subtask opens the details of that row. A link to the thread of a
  // task opens the thread below the row.
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
        <div className="task-list__text">{assignment.do}</div>
      </section>
      <section className="task-list__part">
        <p className="task-list__label">Why the agent can’t do the {kind}</p>
        <div className="task-list__text">{assignment.why}</div>
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

interface ThreadButtonProps {
  readonly task: TaskRow
  readonly kind: 'task' | 'subtask'
  readonly open: boolean
  readonly onToggle: () => void
}

// The speech bubble on the row of a task that has a thread. It's a separate button beside the row,
// because the row of an assigned task is a button itself.
function ThreadButton({ task, kind, open, onToggle }: ThreadButtonProps) {
  const label = `Thread on ${kind} ${task.number}`
  return (
    <button
      type="button"
      className="task-list__thread-button"
      aria-label={label}
      title={label}
      aria-expanded={open}
      aria-controls={open ? `${task.id}-thread` : undefined}
      onClick={onToggle}
    >
      <Icon name="comment" />
    </button>
  )
}

interface RowWithThreadProps extends RowProps {
  // A list with threads has a column for the speech bubble in every row so that the states line up.
  readonly threads: boolean
  readonly threadOpen: boolean
  readonly onThreadToggle: () => void
}

function RowWithThread(props: RowWithThreadProps) {
  const { task, threads, threadOpen, onThreadToggle, ...row } = props
  if (!threads) {
    return <Row task={task} {...row} />
  }
  return (
    <div className="task-list__row">
      <Row task={task} {...row} />
      {task.thread !== undefined && (
        <ThreadButton
          task={task}
          kind={row.subtask ? 'subtask' : 'task'}
          open={threadOpen}
          onToggle={onThreadToggle}
        />
      )}
    </div>
  )
}

function ThreadArea({ task, onClose }: { readonly task: TaskRow; readonly onClose: () => void }) {
  return (
    task.thread !== undefined && (
      <div className="task-list__thread" id={`${task.id}-thread`}>
        {task.thread.content(onClose)}
      </div>
    )
  )
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

function isPointedTo(row: SubtaskRow, openTask: string | undefined): boolean {
  return openTask !== undefined && (row.id === openTask || row.thread?.id === openTask)
}

// The subtasks of a task in progress are open until Nick closes them. The subtasks of any other
// task will be opened if a link points to one of them or to the thread of one of them. The details
// of an assigned task will be opened if a link points to that task.
function shownAtFirst(task: TaskRow, openTask: string | undefined): boolean {
  const subtasks = task.subtasks ?? []
  const pointedTo = task.assignment !== undefined && task.id === openTask
  return (
    pointedTo ||
    (subtasks.length > 0 &&
      (task.state === 'in-progress' || subtasks.some((subtask) => isPointedTo(subtask, openTask))))
  )
}

function rowsOf(tasks: readonly TaskRow[]): SubtaskRow[] {
  return tasks.flatMap((task) => [task, ...(task.subtasks ?? [])])
}

function hasMarks(tasks: readonly TaskRow[]): boolean {
  return rowsOf(tasks).some((row) => row.assignment !== undefined)
}

function hasThreads(tasks: readonly TaskRow[]): boolean {
  return rowsOf(tasks).some((row) => row.thread !== undefined)
}

interface Toggles {
  readonly openRequest: number | undefined
  readonly open: ReadonlyMap<string, boolean>
}

export function TaskList({ tasks, onNavigate, openTask, openRequest }: TaskListProps) {
  const [toggles, setToggles] = useState<Toggles>({ openRequest, open: new Map() })
  const toggled = toggles.openRequest === openRequest ? toggles.open : new Map<string, boolean>()
  const marks = hasMarks(tasks)
  const threads = hasThreads(tasks)
  const isOpen = (task: TaskRow): boolean => toggled.get(task.id) ?? shownAtFirst(task, openTask)
  const toggle = (task: TaskRow) => (): void => {
    setToggles({ openRequest, open: new Map([...toggled, [task.id, !isOpen(task)]]) })
  }
  // The thread of a row is open when a link points to the thread.
  const threadKey = (task: SubtaskRow): string => `${task.id}-thread`
  const isThreadOpen = (task: SubtaskRow): boolean =>
    toggled.get(threadKey(task)) ?? (task.thread?.id !== undefined && task.thread.id === openTask)
  const setThreadOpen = (task: SubtaskRow, open: boolean) => (): void => {
    setToggles({ openRequest, open: new Map([...toggled, [threadKey(task), open]]) })
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
            <RowWithThread
              task={task}
              subtask={false}
              open={open}
              onToggle={toggle(task)}
              onNavigate={onNavigate}
              marks={marks}
              threads={threads}
              threadOpen={isThreadOpen(task)}
              onThreadToggle={setThreadOpen(task, !isThreadOpen(task))}
            />
            {open && task.assignment !== undefined && (
              <Details
                id={`${task.id}-details`}
                kind="task"
                assignment={task.assignment}
                onNavigate={onNavigate}
              />
            )}
            {isThreadOpen(task) && <ThreadArea task={task} onClose={setThreadOpen(task, false)} />}
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
                      <RowWithThread
                        task={subtask}
                        subtask={true}
                        open={subtaskOpen}
                        onToggle={toggle(subtask)}
                        onNavigate={onNavigate}
                        marks={marks}
                        threads={threads}
                        threadOpen={isThreadOpen(subtask)}
                        onThreadToggle={setThreadOpen(subtask, !isThreadOpen(subtask))}
                      />
                      {subtaskOpen && subtask.assignment !== undefined && (
                        <Details
                          id={`${subtask.id}-details`}
                          kind="subtask"
                          assignment={subtask.assignment}
                          onNavigate={onNavigate}
                        />
                      )}
                      {isThreadOpen(subtask) && (
                        <ThreadArea task={subtask} onClose={setThreadOpen(subtask, false)} />
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

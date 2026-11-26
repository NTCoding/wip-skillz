import { type ReactNode } from 'react'
import {
  type Improvements,
  type ProgressTracker,
  type Thread,
  type ViewedPage,
} from './api-responses'
import { fileOfPage, improvementAnchor } from './browser-route'
import {
  ImprovementList,
  Notice,
  ReadingColumn,
  TaskList,
  TaskSection,
  type ImprovementRow,
  type SubtaskRow,
} from './design-system/design-system'
import { type LoadedValue } from './loaded-value'
import { pageElements, parsedPageBody, type PageElementContext } from './page-elements'
import { type PageActions } from './page-with-threads'
import { rowThreadOf } from './task-threads'

export function LoadingView({ loaded }: { readonly loaded: LoadedValue<unknown> }) {
  return (
    <ReadingColumn>
      {loaded.status === 'failed' ? (
        <Notice tone="warning">{loaded.message}</Notice>
      ) : (
        <Notice tone="info">Loading…</Notice>
      )}
    </ReadingColumn>
  )
}

type MarkdownContext = Pick<
  PageElementContext,
  'addresses' | 'onNavigate' | 'loadPreview' | 'findTask'
>

// Shows Markdown that isn't on a page, like the details of an improvement or the description of a
// task. The server resolves its links as if it were on the index page.
function markdownElements(
  html: string,
  links: ViewedPage['links'],
  context: MarkdownContext,
): ReactNode {
  const page = {
    page: 'pages/index.md',
    title: undefined,
    html,
    headings: [],
    links,
    decisions: [],
  }
  const elementContext = {
    ...context,
    page,
    onAnswerDecision: undefined,
    onRequestDecisionChanges: undefined,
    onCommentOnBlock: undefined,
    answersOnThisPage: new Map(),
  }
  return pageElements(elementContext, parsedPageBody(html), new Map())
}

interface ProgressTrackerViewProps {
  readonly tracker: ProgressTracker
  readonly context: MarkdownContext
  // The id of the task that the address points to, like t-4
  readonly openSection: string | undefined
  // The number of links that Nick has followed, which opens a section again that he has closed
  readonly navigations: number
  // Every thread of the scratch pad. The threads on tasks are shown on the rows of their tasks.
  readonly threads: readonly Thread[]
  readonly actions: PageActions | undefined
}

// The context of a row, which the rows of the tasks and of the subtasks share
interface RowContext {
  readonly context: MarkdownContext
  readonly threads: readonly Thread[]
  readonly actions: PageActions | undefined
}

type TaskOnTracker = ProgressTracker['tasks'][number]
type SubtaskOnTracker = TaskOnTracker['subtasks'][number]

function hasSection(task: TaskOnTracker): boolean {
  return task.html !== undefined || task.subtasks.some((subtask) => subtask.html !== undefined)
}

// The row of an assigned task is the anchor of the task, because a link from the Inbox opens the
// row. That's why the heading of its description has another anchor, like t-4-description.
function sectionAnchor(entry: SubtaskOnTracker | TaskOnTracker): string {
  return entry.assignment === undefined ? entry.id : `${entry.id}-description`
}

// The title of a task links to its section below the list. A task without a section has the id of
// the task on its row instead, which a link to the task points to. The row of an assigned task
// shows what Nick has to do and links to the description of the task. The row of an assigned task
// has the thread of the task too. The row of an unassigned task only has the thread when Nick has
// already written in the thread.
function rowOf(
  entry: SubtaskOnTracker | TaskOnTracker,
  withSection: boolean,
  { context, threads, actions }: RowContext,
): SubtaskRow {
  const href = withSection ? context.addresses.progressTrackerHref(sectionAnchor(entry)) : undefined
  const { assignment } = entry
  const hasThread = threads.some((thread) => thread.task === entry.id)
  return {
    id: entry.id,
    number: String(entry.number),
    title: entry.title,
    state: entry.state,
    href: assignment === undefined ? href : undefined,
    anchor: !withSection || assignment !== undefined,
    assignment:
      assignment === undefined
        ? undefined
        : {
            do: markdownElements(assignment.doHtml, assignment.links, context),
            why: markdownElements(assignment.whyHtml, assignment.links, context),
            descriptionHref: entry.html === undefined ? undefined : href,
          },
    thread:
      assignment !== undefined || hasThread ? rowThreadOf(entry.id, threads, actions) : undefined,
  }
}

// Each task that has a description, or a subtask with a description, has its own collapsed section
// below the list. The section of a subtask is inside the section of its task.
function TaskSections({ tracker, context, openSection, navigations }: ProgressTrackerViewProps) {
  return tracker.tasks.filter(hasSection).map((task) => (
    <TaskSection
      key={task.id}
      id={sectionAnchor(task)}
      level={2}
      title={`${task.number}. ${task.title}`}
      open={[task, ...task.subtasks].some((entry) => sectionAnchor(entry) === openSection)}
      openRequest={navigations}
    >
      {task.html !== undefined && markdownElements(task.html, task.links, context)}
      {task.subtasks.map(
        (subtask) =>
          subtask.html !== undefined && (
            <TaskSection
              key={subtask.id}
              id={sectionAnchor(subtask)}
              level={3}
              title={`${subtask.number} ${subtask.title}`}
              open={sectionAnchor(subtask) === openSection}
              openRequest={navigations}
            >
              {markdownElements(subtask.html, subtask.links, context)}
            </TaskSection>
          ),
      )}
    </TaskSection>
  ))
}

// The task that the address points to. A link to the description of an assigned task points to
// the task too. So the row of the task stays open when Nick follows the link in its details. A
// link to the thread of a task points to the thread.
function pointedTask(
  tracker: ProgressTracker,
  openSection: string | undefined,
): string | undefined {
  const entry = tracker.tasks
    .flatMap((task): (SubtaskOnTracker | TaskOnTracker)[] => [task, ...task.subtasks])
    .find((each) => sectionAnchor(each) === openSection)
  return entry?.id ?? openSection
}

export function ProgressTrackerView(props: ProgressTrackerViewProps) {
  const { tracker, context } = props
  const rowContext = { context, threads: props.threads, actions: props.actions }
  const rows = tracker.tasks.map((task) => ({
    ...rowOf(task, hasSection(task), rowContext),
    subtasks: task.subtasks.map((subtask) =>
      rowOf(subtask, subtask.html !== undefined, rowContext),
    ),
  }))
  return (
    <ReadingColumn>
      <h1>Progress tracker</h1>
      <p>
        {tracker.goal === undefined ? 'The goal hasn’t been set yet.' : `Goal: ${tracker.goal}`}
      </p>
      {tracker.tasks.length === 0 ? (
        <Notice tone="info">There aren’t any tasks yet.</Notice>
      ) : (
        <TaskList
          tasks={rows}
          onNavigate={context.onNavigate}
          openTask={pointedTask(tracker, props.openSection)}
          openRequest={props.navigations}
        />
      )}
      <TaskSections {...props} />
    </ReadingColumn>
  )
}

interface ImprovementsViewProps {
  readonly improvements: Improvements
  readonly openEntry: string | undefined
  readonly context: MarkdownContext
  readonly actions: PageActions | undefined
}

function improvementRows(props: ImprovementsViewProps): ImprovementRow[] {
  const { improvements, openEntry, context } = props
  const fromAgent = improvements.improvements.map((improvement): ImprovementRow => {
    const id = improvementAnchor(improvement.number)
    return {
      from: 'agent',
      id,
      number: improvement.number,
      time: improvement.time,
      title: improvement.title,
      markdown: improvement.details,
      details:
        improvement.html === undefined
          ? undefined
          : markdownElements(improvement.html, improvement.links, context),
      open: id === openEntry,
    }
  })
  const notes = improvements.notes.map((note): ImprovementRow => ({
    from: note.type,
    id: note.id,
    href: context.addresses.pageHref(fileOfPage(note.page), note.id),
    time: note.time,
    text: note.text,
    outcome: note.outcome,
  }))
  return [...fromAgent, ...notes].toSorted((first, second) => first.time.localeCompare(second.time))
}

export function ImprovementsView(props: ImprovementsViewProps) {
  const rows = improvementRows(props)
  const { actions } = props
  return (
    <ReadingColumn>
      <h1>Improvements</h1>
      {rows.length === 0 ? (
        <Notice tone="info">There aren’t any improvements yet.</Notice>
      ) : (
        <ImprovementList
          label="Improvements"
          entries={rows}
          onNavigate={props.context.onNavigate}
          actions={
            actions === undefined
              ? undefined
              : { edit: actions.editImprovement, delete: actions.deleteImprovement }
          }
        />
      )}
    </ReadingColumn>
  )
}

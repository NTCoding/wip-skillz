import { type ReactNode } from 'react'
import {
  type DecisionLogEntry,
  type Improvements,
  type ProgressTracker,
  type ViewedPage,
} from './api-responses'
import { fileOfPage, improvementAnchor } from './browser-route'
import {
  DecisionLog,
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
}

type TaskOnTracker = ProgressTracker['tasks'][number]
type SubtaskOnTracker = TaskOnTracker['subtasks'][number]

function hasSection(task: TaskOnTracker): boolean {
  return task.html !== undefined || task.subtasks.some((subtask) => subtask.html !== undefined)
}

// The title of a task links to its section below the list. A task without a section has the id of
// the task on its row instead, which a link to the task points to.
function rowOf(
  entry: SubtaskOnTracker | TaskOnTracker,
  withSection: boolean,
  context: MarkdownContext,
): SubtaskRow {
  return {
    id: entry.id,
    number: String(entry.number),
    title: entry.title,
    state: entry.state,
    href: withSection ? context.addresses.progressTrackerHref(entry.id) : undefined,
    anchor: !withSection,
  }
}

// Each task that has a description, or a subtask with a description, has its own collapsed section
// below the list. The section of a subtask is inside the section of its task.
function TaskSections({ tracker, context, openSection, navigations }: ProgressTrackerViewProps) {
  return tracker.tasks.filter(hasSection).map((task) => (
    <TaskSection
      key={task.id}
      id={task.id}
      level={2}
      title={`${task.number}. ${task.title}`}
      open={[task, ...task.subtasks].some((entry) => entry.id === openSection)}
      openRequest={navigations}
    >
      {task.html !== undefined && markdownElements(task.html, task.links, context)}
      {task.subtasks.map(
        (subtask) =>
          subtask.html !== undefined && (
            <TaskSection
              key={subtask.id}
              id={subtask.id}
              level={3}
              title={`${subtask.number} ${subtask.title}`}
              open={subtask.id === openSection}
              openRequest={navigations}
            >
              {markdownElements(subtask.html, subtask.links, context)}
            </TaskSection>
          ),
      )}
    </TaskSection>
  ))
}

export function ProgressTrackerView(props: ProgressTrackerViewProps) {
  const { tracker, context } = props
  const rows = tracker.tasks.map((task) => ({
    ...rowOf(task, hasSection(task), context),
    subtasks: task.subtasks.map((subtask) => rowOf(subtask, subtask.html !== undefined, context)),
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
          openTask={props.openSection}
          openRequest={props.navigations}
        />
      )}
      <TaskSections {...props} />
    </ReadingColumn>
  )
}

export function DecisionLogView({ entries }: { readonly entries: readonly DecisionLogEntry[] }) {
  return (
    <ReadingColumn>
      <h1>Decisions</h1>
      {entries.length === 0 ? (
        <Notice tone="info">There aren’t any decisions in the log yet.</Notice>
      ) : (
        <DecisionLog entries={entries} />
      )}
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

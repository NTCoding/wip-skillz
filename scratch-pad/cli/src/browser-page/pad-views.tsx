import { type ReactNode } from 'react'
import { type DecisionLogEntry, type Improvements, type ProgressTracker } from './api-responses'
import { fileOfPage, improvementAnchor } from './browser-route'
import {
  DecisionLog,
  ImprovementList,
  Notice,
  ReadingColumn,
  TaskList,
  type ImprovementRow,
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

export function ProgressTrackerView({ tracker }: { readonly tracker: ProgressTracker }) {
  return (
    <ReadingColumn>
      <h1>Progress tracker</h1>
      <p>
        {tracker.goal === undefined ? 'The goal hasn’t been set yet.' : `Goal: ${tracker.goal}`}
      </p>
      {tracker.tasks.length === 0 ? (
        <Notice tone="info">There aren’t any tasks yet.</Notice>
      ) : (
        <TaskList tasks={tracker.tasks} />
      )}
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

type ImprovementsContext = Pick<PageElementContext, 'addresses' | 'onNavigate' | 'loadPreview'>

interface ImprovementsViewProps {
  readonly improvements: Improvements
  readonly openEntry: string | undefined
  readonly context: ImprovementsContext
  readonly actions: PageActions | undefined
}

function detailsOf(
  improvement: Improvements['improvements'][number],
  context: ImprovementsContext,
): ReactNode {
  if (improvement.html === undefined) {
    return undefined
  }
  const page = {
    page: 'pages/index.md',
    title: undefined,
    html: improvement.html,
    headings: [],
    links: improvement.links,
    decisions: [],
  }
  const elementContext = {
    ...context,
    page,
    onAnswerDecision: undefined,
    onCommentOnBlock: undefined,
    answersOnThisPage: new Map(),
  }
  return pageElements(elementContext, parsedPageBody(improvement.html), new Map())
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
      details: detailsOf(improvement, context),
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

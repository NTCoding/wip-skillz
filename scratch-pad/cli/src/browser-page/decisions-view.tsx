import { useState } from 'react'
import {
  type DecisionLogEntry,
  type DecisionReview,
  type DecisionsOfPad,
  type PageSummary,
} from './api-responses'
import { fileOfPage, type PadAddresses } from './browser-route'
import {
  DecisionLog,
  FilterPills,
  ItemList,
  Notice,
  ReadingColumn,
  type ItemRow,
  type Navigate,
} from './design-system/design-system'
import { placeOf } from './item-places'
import { type LoadedValue } from './loaded-value'
import { LoadingView } from './pad-views'
import { shownTime } from './message-time'

const filters = ['open', 'changes-requested', 'decided'] as const
type Filter = (typeof filters)[number]

const filterLabels: Readonly<Record<Filter, string>> = {
  open: 'Open',
  'changes-requested': 'Changes requested',
  decided: 'Decided',
}

const emptyTexts: Readonly<Record<Filter, string>> = {
  open: 'There aren’t any open decisions.',
  'changes-requested': 'There aren’t any decisions with changes requested.',
  decided: 'There aren’t any decisions in the log yet.',
}

interface DecisionsViewProps {
  readonly addresses: PadAddresses
  readonly pages: readonly PageSummary[]
  readonly entries: readonly DecisionLogEntry[]
  readonly decisions: DecisionsOfPad
  readonly onNavigate: Navigate
}

// The newest round of each decision. The reviews hold every round, oldest first for each decision.
function newestRounds(reviews: readonly DecisionReview[]): DecisionReview[] {
  return reviews.filter(
    (review) => !reviews.some((other) => other.id === review.id && other.round > review.round),
  )
}

function newestFirst(first: DecisionReview, second: DecisionReview): number {
  return second.time.localeCompare(first.time)
}

function reviewRow(review: DecisionReview, props: DecisionsViewProps): ItemRow {
  return {
    key: review.id,
    kind: 'Changes requested',
    where: placeOf(props.pages, review.page, undefined),
    quote: review.question,
    quoteKind: 'decision',
    last: `Nick: ${review.reason}`,
    time: review.time,
    shownTime: shownTime(review.time),
    late: false,
    linkLabel: 'Open the decision',
    href: props.addresses.pageHref(fileOfPage(review.page), review.id),
  }
}

// An open decision that the agent has reopened shows the reason of Nick and the line that the agent
// wrote, because Nick needs to see what changed before he decides.
function openRows(props: DecisionsViewProps): ItemRow[] {
  return props.decisions.open.map((decision) => {
    const reopened = newestRounds(props.decisions.reviews).find(
      (review) => review.id === decision.id && review.outcome !== undefined,
    )
    return {
      key: decision.id,
      kind: reopened === undefined ? 'Waiting for you' : 'Reopened by the agent',
      where: placeOf(props.pages, decision.page, undefined),
      quote: decision.question,
      quoteKind: 'decision',
      last: reopened === undefined ? undefined : `Nick: ${reopened.reason}`,
      lastExtra: reopened?.outcome === undefined ? undefined : `The agent: ${reopened.outcome}`,
      time: decision.time,
      shownTime: shownTime(decision.time),
      late: false,
      linkLabel: 'Open the decision',
      href: props.addresses.pageHref(fileOfPage(decision.page), decision.id),
    }
  })
}

function changesRequestedRows(props: DecisionsViewProps): ItemRow[] {
  return newestRounds(props.decisions.reviews)
    .filter((review) => review.outcome === undefined)
    .toSorted(newestFirst)
    .map((review) => reviewRow(review, props))
}

export function DecisionsView(props: DecisionsViewProps) {
  const [filter, setFilter] = useState<Filter>('open')
  const rows: Readonly<Record<Exclude<Filter, 'decided'>, ItemRow[]>> = {
    open: openRows(props),
    'changes-requested': changesRequestedRows(props),
  }
  const counts: Readonly<Record<Filter, number>> = {
    open: rows.open.length,
    'changes-requested': rows['changes-requested'].length,
    decided: props.entries.length,
  }
  const shownRows = filter === 'decided' ? [] : rows[filter]
  return (
    <ReadingColumn>
      <h1>Decisions</h1>
      <FilterPills
        label="Show"
        pills={filters.map((value) => ({
          value,
          label: filterLabels[value],
          count: counts[value],
        }))}
        selected={filter}
        onSelect={setFilter}
      />
      {counts[filter] === 0 && <Notice tone="info">{emptyTexts[filter]}</Notice>}
      {filter === 'decided' && props.entries.length > 0 && <DecisionLog entries={props.entries} />}
      {shownRows.length > 0 && (
        <ItemList
          groups={[{ title: undefined, count: shownRows.length, rows: shownRows }]}
          onNavigate={props.onNavigate}
        />
      )}
    </ReadingColumn>
  )
}

interface DecisionsRouteProps extends Omit<DecisionsViewProps, 'entries' | 'decisions'> {
  readonly log: LoadedValue<DecisionLogEntry[]>
  readonly decisions: LoadedValue<DecisionsOfPad>
}

// The page waits until the log and the decisions are loaded.
export function DecisionsRoute(props: DecisionsRouteProps) {
  const { log, decisions } = props
  if (log.status !== 'loaded') {
    return <LoadingView loaded={log} />
  }
  if (decisions.status !== 'loaded') {
    return <LoadingView loaded={decisions} />
  }
  return (
    <DecisionsView
      addresses={props.addresses}
      pages={props.pages}
      entries={log.value}
      decisions={decisions.value}
      onNavigate={props.onNavigate}
    />
  )
}

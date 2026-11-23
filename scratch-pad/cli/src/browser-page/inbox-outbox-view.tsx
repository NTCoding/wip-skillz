import { useEffect, useState } from 'react'
import { type PageSummary, type QueuedItem, type Thread, type ThreadOfPad } from './api-responses'
import { fileOfPage, type PadAddresses } from './browser-route'
import {
  answerCountOf,
  FilterPills,
  ItemList,
  Notice,
  ReadingColumn,
  type InboxEntry,
  type ItemGroup,
  type ItemRow,
  type Navigate,
} from './design-system/design-system'
import { queuedItemPlace, quoteOf, threadPlace } from './item-places'
import { timeAgo } from './message-time'
import { authorNames } from './nick-inbox-entries'
import { queuedKey } from './queued-items'

// A comment that has waited for the agent for longer than this is shown as late.
const lateAfterMilliseconds = 15 * 60_000

const statuses = ['waiting-for-nick', 'waiting-for-agent', 'outbox', 'resolved'] as const
type Status = (typeof statuses)[number]
type Filter = 'all' | Status

const statusTitles: Readonly<Record<Status, string>> = {
  'waiting-for-nick': 'Waiting for you',
  'waiting-for-agent': 'Waiting for the agent',
  outbox: 'In the outbox',
  resolved: 'Resolved',
}

const entryLinks: Readonly<Record<InboxEntry['kind'], string>> = {
  page: 'Open the page',
  section: 'Open the page',
  reply: 'Open the thread',
  decision: 'Open the decision',
  task: 'Open the task',
}

const entryQuotes: Readonly<Record<InboxEntry['kind'], ItemRow['quoteKind']>> = {
  page: 'description',
  section: 'text',
  reply: 'text',
  decision: 'decision',
  task: 'description',
}

interface InboxOutboxViewProps {
  readonly addresses: PadAddresses
  readonly pages: readonly PageSummary[]
  readonly inboxEntries: readonly InboxEntry[]
  readonly threads: readonly ThreadOfPad[]
  readonly outbox: readonly QueuedItem[]
  readonly onNavigate: Navigate
}

// The time now, which changes every minute so that the times like "Sent 25 min ago" stay right
function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])
  return now
}

// The kind of a task row is the number and title of the task. Its quote is the first line of what
// Nick has to do.
function entryRow(entry: InboxEntry): ItemRow {
  const { task } = entry
  return {
    key: entry.key,
    kind: task === undefined ? entry.heading : `${task.number} ${entry.heading}`,
    where: entry.where,
    quote: task === undefined ? entry.quote : task.summary,
    quoteKind: entryQuotes[entry.kind],
    last: entry.last,
    time: entry.time,
    shownTime: entry.shownTime,
    late: false,
    linkLabel: entryLinks[entry.kind],
    href: entry.href,
  }
}

interface ThreadRowContext {
  readonly props: InboxOutboxViewProps
  readonly now: number
}

function threadRow(thread: ThreadOfPad, context: ThreadRowContext): ItemRow[] {
  const [first] = thread.messages
  const last = thread.messages.at(-1)
  if (first === undefined || last === undefined) {
    return []
  }
  const resolved = thread.waitsFor === 'nobody'
  const time = resolved ? thread.resolvedTime : last.time
  const ago = time === undefined ? undefined : timeAgo(time, context.now)
  return [
    {
      key: thread.id,
      kind: resolved ? 'Resolved' : 'Sent, no reply yet',
      where: threadPlace(context.props.pages, thread),
      quote: quoteOf(thread, first.text),
      quoteKind: 'text',
      last: `${authorNames[last.author]}: ${last.text}`,
      time,
      shownTime: [resolved ? 'Resolved' : 'Sent', ago]
        .filter((part) => part !== undefined)
        .join(' '),
      late: !resolved && context.now - Date.parse(last.time) > lateAfterMilliseconds,
      linkLabel: 'Open the thread',
      href: context.props.addresses.pageHref(fileOfPage(thread.page), thread.id),
    },
  ]
}

function queuedRow(item: QueuedItem, props: InboxOutboxViewProps): ItemRow[] {
  const place = queuedItemPlace(props.pages, props.threads, item)
  if (place === undefined) {
    return []
  }
  return [
    {
      key: queuedKey(item),
      kind: 'In the outbox',
      where: place.where,
      quote: place.quote,
      quoteKind: 'text',
      last: `Nick: ${item.text}`,
      time: item.time,
      shownTime: 'Not sent yet',
      late: false,
      linkLabel: 'Open the thread',
      href: props.addresses.pageHref(fileOfPage(place.page), place.card),
    },
  ]
}

function isComment(thread: Thread): boolean {
  return thread.type === 'comment'
}

// A row without a time comes last.
function byTime(first: ItemRow, second: ItemRow): number {
  if (first.time === undefined || second.time === undefined) {
    return Number(first.time === undefined) - Number(second.time === undefined)
  }
  return first.time.localeCompare(second.time)
}

function newestFirst(first: ItemRow, second: ItemRow): number {
  const oldest = byTime(first, second)
  return first.time === undefined || second.time === undefined ? oldest : -oldest
}

function rowsByStatus(props: InboxOutboxViewProps, now: number): Record<Status, ItemRow[]> {
  const comments = props.threads.filter(isComment)
  const context = { props, now }
  return {
    'waiting-for-nick': props.inboxEntries.map(entryRow),
    'waiting-for-agent': comments
      .filter((thread) => thread.waitsFor === 'agent')
      .flatMap((thread) => threadRow(thread, context))
      .toSorted(byTime),
    outbox: props.outbox.flatMap((item) => queuedRow(item, props)),
    resolved: comments
      .filter((thread) => thread.waitsFor === 'nobody')
      .flatMap((thread) => threadRow(thread, context))
      .toSorted(newestFirst),
  }
}

// The count of "Waiting for you" is the count on the Inbox button. It leaves out the updates to
// pages, because an update to a page doesn't need an answer. The updates to pages are still listed
// under "Waiting for you". The count of "All" is the sum of the other counts.
function countsOf(
  rows: Record<Status, ItemRow[]>,
  props: InboxOutboxViewProps,
): Record<Status, number> {
  return {
    'waiting-for-nick': answerCountOf(props.inboxEntries),
    'waiting-for-agent': rows['waiting-for-agent'].length,
    outbox: rows.outbox.length,
    resolved: rows.resolved.length,
  }
}

function groupsOf(
  rows: Record<Status, ItemRow[]>,
  counts: Record<Status, number>,
  filter: Filter,
): ItemGroup[] {
  if (filter !== 'all') {
    return rows[filter].length === 0
      ? []
      : [{ title: undefined, count: counts[filter], rows: rows[filter] }]
  }
  return statuses
    .filter((status) => rows[status].length > 0)
    .map((status) => ({ title: statusTitles[status], count: counts[status], rows: rows[status] }))
}

export function InboxOutboxView(props: InboxOutboxViewProps) {
  const now = useNow()
  const [filter, setFilter] = useState<Filter>('all')
  const rows = rowsByStatus(props, now)
  const counts = countsOf(rows, props)
  const groups = groupsOf(rows, counts, filter)
  return (
    <ReadingColumn>
      <h1>Inbox / Outbox</h1>
      <FilterPills
        label="Show"
        pills={[
          {
            value: 'all',
            label: 'All',
            count: statuses.reduce((sum, status) => sum + counts[status], 0),
          },
          ...statuses.map((status) => ({
            value: status,
            label: statusTitles[status],
            count: counts[status],
          })),
        ]}
        selected={filter}
        onSelect={setFilter}
      />
      {groups.length === 0 ? (
        <Notice tone="info">There aren’t any items here.</Notice>
      ) : (
        <ItemList groups={groups} onNavigate={props.onNavigate} />
      )}
    </ReadingColumn>
  )
}

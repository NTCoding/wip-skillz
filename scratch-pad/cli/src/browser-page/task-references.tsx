import { type ReactNode } from 'react'
import { type PageSummary, type ProgressTracker } from './api-responses'
import { type PadAddresses } from './browser-route'
import { TaskChips, type Navigate, type TaskChipRow } from './design-system/design-system'
import { type LoadedValue } from './loaded-value'
import { type PageMarks } from './page-elements'
import { parentsOf } from './page-tree'

type TaskOnTracker = ProgressTracker['tasks'][number]
type SubtaskOnTracker = TaskOnTracker['subtasks'][number]
type TrackerEntry = TaskOnTracker | SubtaskOnTracker

// Finds a task or a subtask by its id, like t-4. A page shows a reference like <task:t-4> as the
// number and the title of that task.
export type FindTask = (id: string) => TrackerEntry | undefined

export const taskReferenceScheme = 'task:'

// The tasks and their subtasks in the order of the tracker. Each task comes before its subtasks.
function trackerEntries(tracker: ProgressTracker): TrackerEntry[] {
  return tracker.tasks.flatMap((task) => [task, ...task.subtasks])
}

export function taskFinder(tracker: ProgressTracker | undefined): FindTask {
  const entries = tracker === undefined ? [] : trackerEntries(tracker)
  return (id) => entries.find((entry) => entry.id === id)
}

// Like "2.1 Retry a failed export"
export function taskLabel(entry: TrackerEntry): string {
  return `${entry.number} ${entry.title}`
}

// A page is part of each task or subtask whose description links to the page or to a page above
// it in the numbering, like 2-retry-limit.md above 2.1.1-first-retry.md. A link to a heading of a
// page, like retry-limit.md#d-4, doesn't count.
function taskChipsOf(
  tracker: ProgressTracker | undefined,
  pages: readonly PageSummary[],
  page: string,
  addresses: PadAddresses,
): TaskChipRow[] {
  const shown = pages.find((summary) => summary.page === page)
  if (tracker === undefined || shown === undefined) {
    return []
  }
  const pagesAbove = [shown, ...parentsOf(pages, page)]
  const linksToPage = (entry: TrackerEntry): boolean =>
    entry.links.some(
      (link) =>
        link.kind === 'page' &&
        link.headingId === undefined &&
        pagesAbove.some((above) => above.page === link.page || above.file === link.page),
    )
  return trackerEntries(tracker)
    .filter(linksToPage)
    .map((entry) => ({
      id: entry.id,
      label: taskLabel(entry),
      href: addresses.progressTrackerHref(entry.id),
      state: entry.state,
    }))
}

// The chips of the tasks are shown under the title, above the line that tells Nick that the page
// is new.
export function withTaskChips(marks: PageMarks, taskChips: ReactNode): PageMarks {
  return taskChips === undefined
    ? marks
    : {
        ...marks,
        afterTitle: (
          <>
            {taskChips}
            {marks.afterTitle}
          </>
        ),
      }
}

// The chips at the top of a page for the tasks that the page is part of. A page that isn't part of
// any task doesn't show any chips.
export function taskChipsOn(
  tracker: LoadedValue<ProgressTracker>,
  pages: LoadedValue<PageSummary[]>,
  page: string,
  context: { readonly addresses: PadAddresses; readonly onNavigate: Navigate },
): ReactNode {
  const chips = taskChipsOf(
    tracker.status === 'loaded' ? tracker.value : undefined,
    pages.status === 'loaded' ? pages.value : [],
    page,
    context.addresses,
  )
  return chips.length === 0 ? undefined : (
    <TaskChips tasks={chips} onNavigate={context.onNavigate} />
  )
}

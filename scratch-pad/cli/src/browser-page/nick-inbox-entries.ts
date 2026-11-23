import {
  type NickInbox,
  type PageSummary,
  type ProgressTracker,
  type ReadMarks,
} from './api-responses'
import { fileOfPage, type PadAddresses } from './browser-route'
import { type InboxEntry } from './design-system/design-system'
import { placeOf, quoteOf, threadPlace } from './item-places'
import { shownTime } from './message-time'
import { readMarkEntries } from './read-marks'

export const authorNames = { nick: 'Nick', agent: 'Agent' } as const

type TaskOnTracker = ProgressTracker['tasks'][number]
type SubtaskOnTracker = TaskOnTracker['subtasks'][number]

// A task or a subtask that is assigned to Nick and isn't done yet. Nick can't mark a task with
// subtasks as done, because its state follows the states of its subtasks.
function assignedTaskEntry(
  addresses: PadAddresses,
  item: TaskOnTracker | SubtaskOnTracker,
  canBeDone: boolean,
): InboxEntry[] {
  return item.assignment === undefined || item.state === 'done'
    ? []
    : [
        {
          key: item.id,
          href: addresses.progressTrackerHref(item.id),
          kind: 'task',
          heading: item.title,
          where: 'Progress tracker',
          quote: undefined,
          last: undefined,
          time: undefined,
          shownTime: undefined,
          context: undefined,
          task: {
            id: item.id,
            number: String(item.number),
            state: item.state,
            // Everything after the first line is left out.
            summary: item.assignment.do.replace(/\n.*/su, ''),
            canBeDone,
          },
        },
      ]
}

// The tasks and the subtasks that are assigned to Nick, in the order of the progress tracker
function assignedTaskEntries(
  addresses: PadAddresses,
  tracker: ProgressTracker | undefined,
): InboxEntry[] {
  return (tracker?.tasks ?? []).flatMap((task) => [
    ...assignedTaskEntry(addresses, task, task.subtasks.length === 0),
    ...task.subtasks.flatMap((subtask) => assignedTaskEntry(addresses, subtask, true)),
  ])
}

// The decisions and the replies come first, sorted together by their time with the newest first.
// The time of a decision is the time that its page file was last written when the server first
// found the decision. The time of a reply is the time of the thread's last message. The tasks and
// the subtasks that are assigned to Nick come after them. The new pages and the pages with changed
// sections come last.
export function nickInboxEntries(
  addresses: PadAddresses,
  inbox: NickInbox,
  pages: readonly PageSummary[],
  readMarks: ReadMarks,
  tracker: ProgressTracker | undefined,
): InboxEntry[] {
  const decisions = inbox.decisions.map((decision): InboxEntry & { readonly time: string } => ({
    key: decision.id,
    href: addresses.pageHref(fileOfPage(decision.page), decision.id),
    kind: 'decision',
    heading: 'A decision to make',
    where: placeOf(pages, decision.page, undefined),
    quote: decision.question,
    last: undefined,
    time: decision.time,
    shownTime: shownTime(decision.time),
    context:
      decision.context === undefined
        ? undefined
        : {
            lead: decision.context.lead,
            links: decision.context.links.map((link) => ({
              text: link.text,
              href: addresses.pageHref(fileOfPage(link.page), link.headingId),
            })),
          },
  }))
  const replies = inbox.threads.flatMap((thread): (InboxEntry & { readonly time: string })[] => {
    const [first] = thread.messages
    const last = thread.messages.at(-1)
    return first === undefined || last === undefined
      ? []
      : [
          {
            key: thread.id,
            href: addresses.pageHref(fileOfPage(thread.page), thread.id),
            kind: 'reply',
            heading: 'The agent replied',
            where: threadPlace(pages, thread),
            quote: quoteOf(thread, first.text),
            last: `${authorNames[last.author]}: ${last.text}`,
            time: last.time,
            shownTime: shownTime(last.time),
            context: undefined,
          },
        ]
  })
  return [
    ...[...decisions, ...replies].toSorted((one, other) => other.time.localeCompare(one.time)),
    ...assignedTaskEntries(addresses, tracker),
    ...readMarkEntries(addresses, readMarks, pages),
  ]
}

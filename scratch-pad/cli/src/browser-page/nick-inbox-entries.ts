import { type NickInbox, type PageSummary, type ReadMarks } from './api-responses'
import { fileOfPage, type PadAddresses } from './browser-route'
import { type InboxEntry } from './design-system/design-system'
import { placeOf, quoteOf, threadPlace } from './item-places'
import { shownTime } from './message-time'
import { readMarkEntries } from './read-marks'

export const authorNames = { nick: 'Nick', agent: 'Agent' } as const

// The decisions and the replies come first, sorted together by their time with the newest first.
// The time of a decision is the time that its page file was last written when the server first
// found the decision. The time of a reply is the time of the thread's last message. The new pages and the pages with
// changed sections come last.
export function nickInboxEntries(
  addresses: PadAddresses,
  inbox: NickInbox,
  pages: readonly PageSummary[],
  readMarks: ReadMarks,
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
    ...readMarkEntries(addresses, readMarks, pages),
  ]
}

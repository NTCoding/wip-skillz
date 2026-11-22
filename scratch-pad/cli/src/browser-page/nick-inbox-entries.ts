import { type NickInbox, type PageSummary, type ReadMarks } from './api-responses'
import { fileOfPage, type PadAddresses } from './browser-route'
import { type InboxEntry } from './design-system/design-system'
import { placeOf, quoteOf, threadPlace } from './item-places'
import { shownTime } from './message-time'
import { readMarkEntries } from './read-marks'

export const authorNames = { nick: 'Nick', agent: 'Agent' } as const

export function nickInboxEntries(
  addresses: PadAddresses,
  inbox: NickInbox,
  pages: readonly PageSummary[],
  readMarks: ReadMarks,
): InboxEntry[] {
  const decisions = inbox.decisions.map((decision): InboxEntry => ({
    key: decision.id,
    href: addresses.pageHref(fileOfPage(decision.page), decision.id),
    kind: 'decision',
    where: placeOf(pages, decision.page, undefined),
    quote: decision.question,
    last: undefined,
    time: undefined,
    shownTime: undefined,
  }))
  const replies = inbox.threads.flatMap((thread): InboxEntry[] => {
    const [first] = thread.messages
    const last = thread.messages.at(-1)
    return first === undefined || last === undefined
      ? []
      : [
          {
            key: thread.id,
            href: addresses.pageHref(fileOfPage(thread.page), thread.id),
            kind: 'reply',
            where: threadPlace(pages, thread),
            quote: quoteOf(thread, first.text),
            last: `${authorNames[last.author]}: ${last.text}`,
            time: last.time,
            shownTime: shownTime(last.time),
          },
        ]
  })
  return [...readMarkEntries(addresses, readMarks, pages), ...decisions, ...replies]
}

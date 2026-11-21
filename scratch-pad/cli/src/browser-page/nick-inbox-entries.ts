import { type NickInbox, type PageSummary, type Thread } from './api-responses'
import { fileOfPage, type PadAddresses } from './browser-route'
import { type InboxEntry } from './design-system/design-system'
import { shownTime } from './message-time'

function titleOf(pages: readonly PageSummary[], page: string): string {
  return pages.find((summary) => summary.page === page)?.title ?? fileOfPage(page)
}

function quoteOf(thread: Thread, firstMessage: string): string {
  if (thread.position?.kind === 'attached') {
    return thread.position.text
  }
  return thread.anchor?.selectedText ?? firstMessage
}

const authorNames = { nick: 'Nick', agent: 'Agent' } as const

export function nickInboxEntries(
  addresses: PadAddresses,
  inbox: NickInbox,
  pages: readonly PageSummary[],
): InboxEntry[] {
  const decisions = inbox.decisions.map((decision): InboxEntry => ({
    key: decision.id,
    href: addresses.pageHref(fileOfPage(decision.page), decision.id),
    kind: 'decision',
    where: titleOf(pages, decision.page),
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
            where: titleOf(pages, thread.page),
            quote: quoteOf(thread, first.text),
            last: `${authorNames[last.author]}: ${last.text}`,
            time: last.time,
            shownTime: shownTime(last.time),
          },
        ]
  })
  return [...decisions, ...replies]
}

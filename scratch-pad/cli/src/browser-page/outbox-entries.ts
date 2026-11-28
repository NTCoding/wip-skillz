import { type PageSummary, type QueuedItem, type Thread } from './api-responses'
import { type PadAddresses } from './browser-route'
import { type OutboxEntry } from './design-system/design-system'
import { cardHref, queuedItemPlace } from './item-places'
import { shownTime } from './message-time'
import { queuedKey } from './queued-items'

export function queuedItemText(item: QueuedItem): string {
  if (item.kind !== 'decision') {
    return item.text
  }
  return 'choice' in item.answer ? (item.chosenOption ?? item.answer.choice) : item.answer.written
}

// The entries of the Outbox in the top bar. Each entry links to the card of its item, where Nick
// edits or removes the item. A reply to a thread that isn't in the threads is left out.
export function outboxEntries(
  addresses: PadAddresses,
  outbox: readonly QueuedItem[],
  pages: readonly PageSummary[],
  threads: readonly Thread[],
): OutboxEntry[] {
  return outbox.flatMap((item): OutboxEntry[] => {
    const place = queuedItemPlace(pages, threads, item)
    return place === undefined
      ? []
      : [
          {
            key: queuedKey(item),
            href: cardHref(addresses, place.page, place.card),
            kind: item.kind,
            where: place.where,
            quote: place.quote,
            text: queuedItemText(item),
            time: item.time,
            shownTime: `Queued ${shownTime(item.time)}`,
          },
        ]
  })
}

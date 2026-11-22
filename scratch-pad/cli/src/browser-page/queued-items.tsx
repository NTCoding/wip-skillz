import { useCallback, useState } from 'react'
import { type QueuedItem } from './api-responses'
import { OutboxMessage } from './design-system/design-system'
import { shownTime } from './message-time'

export interface QueuedItemActions {
  readonly editQueuedItem: (number: number, message: string) => Promise<void>
  readonly removeQueuedItem: (number: number) => Promise<void>
  // The page calls editingQueuedItem when Nick starts to edit an item in the outbox and when he
  // finishes the edit. Send all is disabled while Nick edits an item.
  readonly editingQueuedItem: (number: number, editing: boolean) => void
}

export function queuedItemMessage(actions: QueuedItemActions, item: QueuedItem, label: string) {
  return (
    <OutboxMessage
      key={item.number}
      label={label}
      text={item.text}
      time={item.time}
      shownTime={shownTime(item.time)}
      onEdit={(text) => actions.editQueuedItem(item.number, text)}
      onRemove={() => actions.removeQueuedItem(item.number)}
      onEditingChange={(editing) => actions.editingQueuedItem(item.number, editing)}
    />
  )
}

// The id of the card of a queued comment, which is also the address of the card on its page
export function queuedKey(item: QueuedItem): string {
  return `outbox-${item.number}`
}

export function queuedRepliesTo(outbox: readonly QueuedItem[], id: string): QueuedItem[] {
  return outbox.filter((item) => item.kind === 'reply' && item.thread === id)
}

// Returns true while Nick edits an item in the outbox. It also returns the function that the
// page calls when Nick starts or finishes an edit.
export function useOutboxEdits(): [boolean, QueuedItemActions['editingQueuedItem']] {
  const [edited, setEdited] = useState<ReadonlySet<number>>(new Set())
  const editingQueuedItem = useCallback((number: number, editing: boolean) => {
    setEdited((current) =>
      editing
        ? new Set([...current, number])
        : new Set([...current].filter((each) => each !== number)),
    )
  }, [])
  return [edited.size > 0, editingQueuedItem]
}

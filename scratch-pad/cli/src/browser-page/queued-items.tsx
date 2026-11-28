import { useCallback, useState } from 'react'
import { type QueuedComment, type QueuedItem } from './api-responses'
import {
  MarginCard,
  MarginMarker,
  OutboxMessage,
  SelectedTextQuote,
  type MarginItem,
} from './design-system/design-system'
import { shownTime } from './message-time'
import { type PlacedThread } from './thread-anchors'

export interface QueuedItemActions {
  readonly editQueuedItem: (number: number, message: string) => Promise<void>
  readonly removeQueuedItem: (number: number) => Promise<void>
  // The page calls editingQueuedItem when Nick starts to edit an item in the outbox and when he
  // finishes the edit. Send all is disabled while Nick edits an item.
  readonly editingQueuedItem: (number: number, editing: boolean) => void
}

type EditableQueuedItem = Exclude<QueuedItem, { readonly kind: 'decision' }>

export function queuedItemMessage(
  actions: QueuedItemActions,
  item: EditableQueuedItem,
  label: string,
) {
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

export function queuedRepliesTo(
  outbox: readonly QueuedItem[],
  id: string,
): Extract<QueuedItem, { readonly kind: 'reply' }>[] {
  return outbox.filter(
    (item): item is Extract<QueuedItem, { readonly kind: 'reply' }> =>
      item.kind === 'reply' && item.thread === id,
  )
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

export function queuedCommentItems(
  placedQueued: readonly PlacedThread<QueuedComment>[],
  actions: QueuedItemActions | undefined,
  anchorOf: (lines: string | undefined) => string | undefined,
  state: {
    readonly active: string | undefined
    readonly hasDraft: boolean
    readonly setActive: (key: string) => void
    readonly toggle: (key: string) => void
  },
): MarginItem[] {
  if (actions === undefined) {
    return []
  }
  return placedQueued.map(({ thread: item, blockLines }) => {
    const key = queuedKey(item)
    const open = !state.hasDraft && key === state.active
    return {
      key,
      anchorLines: anchorOf(blockLines),
      content: (
        <MarginCard
          id={key}
          label="Comment in the outbox"
          name="the comment in the outbox"
          kind="comment"
          active={key === state.active}
          onFocus={() => state.setActive(key)}
        >
          {(fullSize) => (
            <>
              {fullSize && <SelectedTextQuote quote={item.anchor} kind="comment" />}
              {queuedItemMessage(actions, item, 'Comment')}
            </>
          )}
        </MarginCard>
      ),
      marker: (
        <MarginMarker
          label="Comment in the outbox"
          kind="comment"
          messages={1}
          open={open}
          onClick={() => state.toggle(key)}
        />
      ),
      popup: open,
    }
  })
}

import { useEffect, useRef, useState } from 'react'
import { type NickInbox, type ProgressTracker } from './api-responses'
import { type DesktopNotifications } from './desktop-notifications'
import { IconButton } from './design-system/design-system'
import { type LoadedValue } from './loaded-value'

interface WaitingItem {
  readonly key: string
  readonly text: string
}

// The tasks and the subtasks that are assigned to Nick and aren't done yet. The key of a task is
// its id, which never changes.
function assignedItemsOf(tracker: ProgressTracker): WaitingItem[] {
  return tracker.tasks
    .flatMap((task) => [task, ...task.subtasks])
    .filter((item) => item.assignment !== undefined && item.state !== 'done')
    .map((item) => ({
      key: `task ${item.id}`,
      text: `Assigned to you: ${String(item.number)} ${item.title}`,
    }))
}

// The key of a thread contains the time of its last message. So a new message from the agent
// results in a new key, even if the thread already waited for Nick before. The id of a decision is
// only unique on its own page, which is why the key of a decision contains its page. A thread
// without any messages isn't shown in the Inbox. That's why it isn't a waiting item either.
function waitingItemsOf(inbox: NickInbox): WaitingItem[] {
  const replies = inbox.threads.flatMap((thread): WaitingItem[] => {
    const last = thread.messages.at(-1)
    return last === undefined
      ? []
      : [{ key: `thread ${thread.id} ${last.time}`, text: `The agent replied: ${last.text}` }]
  })
  const decisions = inbox.decisions.map((decision): WaitingItem => ({
    key: `decision ${decision.page} ${decision.id}`,
    text: `A decision to make: ${decision.question}`,
  }))
  return [...replies, ...decisions]
}

// Each item is compared by its key rather than by the count of the items. So if one item is
// resolved and another one starts to wait, the new item is still returned.
function newlyWaitingItems(
  before: readonly WaitingItem[],
  now: readonly WaitingItem[],
): WaitingItem[] {
  const waited = new Set(before.map((item) => item.key))
  return now.filter((item) => !waited.has(item.key))
}

// The items that waited for Nick at the last load of the Inbox and at the last load of the
// progress tracker. Each one is undefined until its first load.
interface ShownItems {
  readonly inbox: readonly WaitingItem[] | undefined
  readonly tracker: readonly WaitingItem[] | undefined
}

// The items of a load that weren't there at the last load. The first load of the Inbox or of the
// progress tracker only remembers its items. A load that failed or that hasn't finished yet
// doesn't change the items that are remembered.
function newItemsOf<T>(
  loaded: LoadedValue<T>,
  shown: readonly WaitingItem[] | undefined,
  itemsOf: (value: T) => WaitingItem[],
): { readonly shown: readonly WaitingItem[] | undefined; readonly newItems: WaitingItem[] } {
  if (loaded.status !== 'loaded') {
    return { shown, newItems: [] }
  }
  const now = itemsOf(loaded.value)
  return { shown: now, newItems: shown === undefined ? [] : newlyWaitingItems(shown, now) }
}

function bodyOf(first: WaitingItem, others: readonly WaitingItem[]): string {
  return others.length === 0 ? first.text : `${others.length + 1} new items wait for you.`
}

// If an item starts to wait for Nick while he's looking elsewhere, a desktop notification will be
// shown. The items that already wait on the first load of the Inbox never cause a notification.
// The Inbox includes the tasks that are assigned to Nick, which are loaded with the progress
// tracker. The replies and the decisions are compared with the last load of the Inbox, whereas the
// tasks are compared with the last load of the progress tracker. So a progress tracker that can't
// be loaded doesn't stop the notifications of the replies and the decisions.
export function useInboxNotifications(
  notifications: DesktopNotifications | undefined,
  padTitle: string,
  inbox: LoadedValue<NickInbox>,
  tracker: LoadedValue<ProgressTracker>,
): void {
  const shownItems = useRef<ShownItems>({ inbox: undefined, tracker: undefined })
  useEffect(() => {
    if (notifications === undefined) {
      return
    }
    const fromInbox = newItemsOf(inbox, shownItems.current.inbox, waitingItemsOf)
    const fromTracker = newItemsOf(tracker, shownItems.current.tracker, assignedItemsOf)
    shownItems.current = { inbox: fromInbox.shown, tracker: fromTracker.shown }
    const [first, ...others] = [...fromInbox.newItems, ...fromTracker.newItems]
    if (
      first !== undefined &&
      notifications.permission() === 'granted' &&
      notifications.lookingElsewhere()
    ) {
      notifications.show(padTitle, bodyOf(first, others))
    }
  }, [notifications, padTitle, inbox, tracker])
}

const permissionButtons = {
  default: { icon: 'bell', label: 'Turn on desktop notifications' },
  granted: { icon: 'bell-ringing', label: 'Desktop notifications are on' },
  denied: { icon: 'bell-off', label: 'The browser blocks desktop notifications' },
} as const

// The browser only shows its prompt for the permission after a click on a button. That's why the
// page doesn't ask for the permission on load. The browser remembers whether Nick allowed or
// blocked the notifications. After that, a click only reads the permission again. Nick can change
// the permission in the settings of the browser too, which is why the button reads the permission
// again whenever the focus comes back to the window.
export function NotificationsButton({
  notifications,
}: {
  readonly notifications: DesktopNotifications
}) {
  const [permission, setPermission] = useState(notifications.permission)
  useEffect(() => {
    const readPermission = (): void => setPermission(notifications.permission())
    window.addEventListener('focus', readPermission)
    return () => window.removeEventListener('focus', readPermission)
  }, [notifications])
  const button = permissionButtons[permission]
  return (
    <IconButton
      icon={button.icon}
      label={button.label}
      onClick={() => {
        void notifications.askPermission().then(setPermission)
      }}
    />
  )
}

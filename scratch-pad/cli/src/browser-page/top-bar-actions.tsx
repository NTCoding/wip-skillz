import {
  Inbox,
  Outbox,
  StatusPill,
  type InboxEntry,
  type Navigate,
  type OutboxEntry,
} from './design-system/design-system'
import { type PageReadMark, type PageSummary } from './api-responses'
import { fileOfPage } from './browser-route'
import { type DesktopNotifications } from './desktop-notifications'
import { NotificationsButton } from './inbox-notifications'
import { PadSearch, type SearchMatch } from './pad-search'
import { type PageActions } from './page-with-threads'
import { type ScratchPadSearch } from './scratch-pad-connection'

// The button after the name of the current page marks a new page as read and a read page as unread.
export function pageActionOf(actions: PageActions | undefined, mark: PageReadMark | undefined) {
  if (actions === undefined || mark === undefined) {
    return undefined
  }
  const file = fileOfPage(mark.page)
  return mark.state === 'new'
    ? { label: 'Mark as read', onClick: () => actions.markPageRead(file, mark.sections) }
    : { label: 'Mark as unread', onClick: () => actions.markPageUnread(file) }
}

interface TopBarActionsProps {
  readonly serverStopped: boolean
  readonly actions: PageActions | undefined
  readonly notifications: DesktopNotifications | undefined
  readonly search: ScratchPadSearch['search'] | undefined
  readonly pages: readonly PageSummary[]
  readonly onOpenSearchMatch: (match: SearchMatch) => void
  readonly inboxEntries: readonly InboxEntry[]
  readonly outboxCount: number
  readonly outboxEntries: readonly OutboxEntry[]
  readonly outboxEditing: boolean
  readonly onNavigate: Navigate
}

export function TopBarActions({
  serverStopped,
  actions,
  notifications,
  search,
  ...props
}: TopBarActionsProps) {
  return (
    <>
      {serverStopped && (
        <StatusPill>The server has stopped. The page will update when it’s back.</StatusPill>
      )}
      {actions !== undefined && (
        <>
          {notifications !== undefined && <NotificationsButton notifications={notifications} />}
          {search !== undefined && (
            <PadSearch search={search} pages={props.pages} onOpen={props.onOpenSearchMatch} />
          )}
          <Inbox
            entries={props.inboxEntries}
            onNavigate={props.onNavigate}
            onMarkDone={actions.markTaskDone}
          />
          <Outbox
            count={props.outboxCount}
            entries={props.outboxEntries}
            editing={props.outboxEditing}
            onSendAll={actions.sendOutbox}
            onNavigate={props.onNavigate}
          />
        </>
      )}
    </>
  )
}

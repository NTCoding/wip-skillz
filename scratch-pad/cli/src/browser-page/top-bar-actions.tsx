import {
  Inbox,
  Outbox,
  StatusPill,
  type InboxEntry,
  type Navigate,
  type OutboxEntry,
} from './design-system/design-system'
import { type PageSummary } from './api-responses'
import { type DesktopNotifications } from './desktop-notifications'
import { NotificationsButton } from './inbox-notifications'
import { PadSearch, type SearchMatch } from './pad-search'
import { type PageActions } from './page-with-threads'
import { type ScratchPadSearch } from './scratch-pad-connection'

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
          <Inbox entries={props.inboxEntries} onNavigate={props.onNavigate} />
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

import {
  Inbox,
  Outbox,
  StatusPill,
  type InboxEntry,
  type Navigate,
  type OutboxEntry,
} from './design-system/design-system'
import { type DesktopNotifications } from './desktop-notifications'
import { NotificationsButton } from './inbox-notifications'
import { type PageActions } from './page-with-threads'

interface TopBarActionsProps {
  readonly serverStopped: boolean
  readonly actions: PageActions | undefined
  readonly notifications: DesktopNotifications | undefined
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

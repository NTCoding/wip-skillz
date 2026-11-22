import {
  Inbox,
  Outbox,
  StatusPill,
  type InboxEntry,
  type Navigate,
} from './design-system/design-system'
import { type PageActions } from './page-with-threads'

interface TopBarActionsProps {
  readonly serverStopped: boolean
  readonly actions: PageActions | undefined
  readonly inboxEntries: readonly InboxEntry[]
  readonly outboxCount: number
  readonly outboxEditing: boolean
  readonly onNavigate: Navigate
}

export function TopBarActions({ serverStopped, actions, ...props }: TopBarActionsProps) {
  return (
    <>
      {serverStopped && (
        <StatusPill>The server has stopped. The page will update when it’s back.</StatusPill>
      )}
      {actions !== undefined && (
        <>
          <Inbox entries={props.inboxEntries} onNavigate={props.onNavigate} />
          <Outbox
            count={props.outboxCount}
            editing={props.outboxEditing}
            onSendAll={actions.sendOutbox}
          />
        </>
      )}
    </>
  )
}

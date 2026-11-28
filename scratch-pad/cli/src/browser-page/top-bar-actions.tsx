import {
  DraftToggle,
  Inbox,
  Outbox,
  StatusPill,
  type InboxEntry,
  type Navigate,
  type OutboxEntry,
} from './design-system/design-system'
import { type PageReadMark } from './api-responses'
import { fileOfPage } from './browser-route'
import { type PageActions } from './page-with-threads'

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
  readonly draftMode: boolean
  readonly onDraftModeChange: (enabled: boolean) => void
  readonly inboxEntries: readonly InboxEntry[]
  readonly outboxCount: number
  readonly outboxEntries: readonly OutboxEntry[]
  readonly outboxEditing: boolean
  readonly onNavigate: Navigate
}

export function TopBarActions({
  serverStopped,
  actions,
  draftMode,
  onDraftModeChange,
  ...props
}: TopBarActionsProps) {
  const showOutbox = draftMode || props.outboxCount > 0
  return (
    <>
      {serverStopped && (
        <StatusPill>The server has stopped. The page will update when it’s back.</StatusPill>
      )}
      {actions !== undefined && (
        <>
          <Inbox
            entries={props.inboxEntries}
            onNavigate={props.onNavigate}
            onMarkDone={actions.markTaskDone}
          />
          {showOutbox && (
            <Outbox
              count={props.outboxCount}
              entries={props.outboxEntries}
              editing={props.outboxEditing}
              onSendAll={actions.sendOutbox}
              onNavigate={props.onNavigate}
            />
          )}
          <DraftToggle enabled={draftMode} onChange={onDraftModeChange} />
        </>
      )}
    </>
  )
}

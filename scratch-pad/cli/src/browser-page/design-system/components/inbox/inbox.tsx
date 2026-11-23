import { useId, useState } from 'react'
import { type Navigate } from '../../navigation-click'
import { Icon } from '../icon/icon'
import { PanelMenu, type AssignedTask, type DecisionContext } from '../panel-menu/panel-menu'
import { TopBarPanel, type TopBarPanelControls } from '../top-bar-panel/top-bar-panel'
import './inbox.css'

export interface InboxEntry {
  readonly key: string
  readonly href: string
  // A reply and a decision need an answer from Nick. A task entry is a task or a subtask that is
  // assigned to Nick, which he has to do. A page entry is a new page and a section entry is a page
  // whose sections have changed since Nick read them. The Inbox shows the page and section entries
  // as updates to pages, below the entries that need an answer. Their quote is undefined, apart
  // from the description of a new page.
  readonly kind: 'reply' | 'decision' | 'task' | 'page' | 'section'
  // What happened, like "The agent replied". The heading of a section entry is the page, like
  // "Updates to Invoice template".
  readonly heading: string
  // The place of the entry, like "Invoice template › Tax number". A section entry shows the number
  // of sections that have changed here instead, like "2 sections changed".
  readonly where: string
  readonly quote: string | undefined
  readonly last: string | undefined
  readonly time: string | undefined
  readonly shownTime: string | undefined
  // Only a decision has a context. It's undefined if the agent hasn't written one.
  readonly context: DecisionContext | undefined
  // Only a task entry has a task. The heading of a task entry is the title of the task.
  readonly task?: AssignedTask | undefined
}

interface InboxProps {
  // The Inbox shows the entries that need an answer and the updates to pages in the order of this
  // list.
  readonly entries: readonly InboxEntry[]
  readonly onNavigate: Navigate
  // Marks a task entry as done. If this is undefined, the task entries won't have a button that
  // marks them as done.
  readonly onMarkDone?: ((id: string) => Promise<void>) | undefined
}

// A task that is assigned to Nick waits for him like a reply or a decision does.
function needsAnswer(entry: InboxEntry): boolean {
  return entry.kind === 'reply' || entry.kind === 'decision' || entry.kind === 'task'
}

// The count on the Inbox button. The blinking title of the tab shows the same count.
export function answerCountOf(entries: readonly InboxEntry[]): number {
  return entries.filter((entry) => needsAnswer(entry)).length
}

// The count only includes the entries that need an answer, because an update to a page doesn't.
function countText(answers: number, updates: number): string {
  if (answers === 0 && updates > 0) {
    return 'pages have been updated'
  }
  return answers === 1 ? '1 item waits for you' : `${answers} items wait for you`
}

function menuItems(entries: readonly InboxEntry[]) {
  return entries.map((entry) => ({
    ...entry,
    linkLabel: entry.kind === 'task' ? 'Read the full details' : undefined,
  }))
}

interface InboxMenuProps extends InboxProps {
  readonly controls: TopBarPanelControls
}

// The updates to pages are collapsed each time the Inbox opens. When there are updates, Tab will
// move the focus from the entries that need an answer to the button of the updates. The focus
// stays on that button when Nick opens the updates, as in the disclosure pattern of WAI-ARIA.
function InboxMenu({ entries, onNavigate, onMarkDone, controls }: InboxMenuProps) {
  const id = useId()
  const [updatesOpen, setUpdatesOpen] = useState(false)
  const answers = entries.filter((entry) => needsAnswer(entry))
  const updates = entries.filter((entry) => !needsAnswer(entry))
  return (
    <div className="inbox">
      <p className="inbox__title" id={`${id}-title`}>
        Needs your answer
      </p>
      {answers.length === 0 ? (
        <p className="inbox__empty">Nothing waits for you.</p>
      ) : (
        <PanelMenu
          id={controls.popupId}
          labelledBy={`${id}-title`}
          items={menuItems(answers)}
          onNavigate={onNavigate}
          onChoose={controls.close}
          onTab={updates.length === 0 ? controls.closeAndFocusButton : undefined}
          focusFirstItem={true}
          onMarkDone={onMarkDone}
          focusPanel={controls.focusPanel}
        />
      )}
      {updates.length > 0 && (
        <>
          <button
            id={`${id}-updates-button`}
            type="button"
            className="inbox__updates"
            aria-expanded={updatesOpen}
            aria-controls={updatesOpen ? `${id}-updates` : undefined}
            onClick={() => setUpdatesOpen(!updatesOpen)}
          >
            <Icon name="chevron" />
            Updates to pages <span className="inbox__updates-count">{updates.length}</span>
          </button>
          {updatesOpen && (
            <PanelMenu
              id={`${id}-updates`}
              labelledBy={`${id}-updates-button`}
              items={menuItems(updates)}
              onNavigate={onNavigate}
              onChoose={controls.close}
              onTab={undefined}
              focusFirstItem={false}
            />
          )}
        </>
      )}
    </div>
  )
}

export function Inbox(props: InboxProps) {
  const answers = answerCountOf(props.entries)
  const updates = props.entries.length - answers
  return (
    <TopBarPanel
      icon="inbox"
      label="Inbox"
      countText={countText(answers, updates)}
      count={answers}
      dot={updates > 0}
      tone="inbox"
      popup={answers === 0 ? undefined : 'menu'}
    >
      {(controls) => <InboxMenu {...props} controls={controls} />}
    </TopBarPanel>
  )
}

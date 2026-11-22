import { useId } from 'react'
import { type Navigate } from '../../navigation-click'
import { PanelMenu } from '../panel-menu/panel-menu'
import { TopBarPanel, type TopBarPanelControls } from '../top-bar-panel/top-bar-panel'
import './inbox.css'

export interface InboxEntry {
  readonly key: string
  readonly href: string
  // A page entry is a new page and a section entry is a section that has changed since Nick read
  // it. Their quote is undefined, apart from the description of a new page.
  readonly kind: 'reply' | 'decision' | 'page' | 'section'
  readonly where: string
  readonly quote: string | undefined
  readonly last: string | undefined
  readonly time: string | undefined
  readonly shownTime: string | undefined
}

interface InboxProps {
  readonly entries: readonly InboxEntry[]
  readonly onNavigate: Navigate
}

const headings = {
  reply: 'The agent replied',
  decision: 'A decision to make',
  page: 'A new page',
  section: 'A section changed',
} as const

function countText(count: number): string {
  return count === 1 ? '1 item waits for you' : `${count} items wait for you`
}

interface InboxMenuProps extends InboxProps {
  readonly controls: TopBarPanelControls
}

function InboxMenu({ entries, onNavigate, controls }: InboxMenuProps) {
  const id = useId()
  return (
    <div className="inbox">
      <p className="inbox__title" id={`${id}-title`}>
        Waiting for you
      </p>
      {entries.length === 0 ? (
        <p className="inbox__empty">Nothing waits for you.</p>
      ) : (
        <PanelMenu
          id={controls.popupId}
          labelledBy={`${id}-title`}
          items={entries.map((entry) => ({
            ...entry,
            heading: headings[entry.kind],
            linkLabel: undefined,
          }))}
          onNavigate={onNavigate}
          onChoose={controls.close}
          onTab={controls.closeAndFocusButton}
        />
      )}
    </div>
  )
}

export function Inbox(props: InboxProps) {
  return (
    <TopBarPanel
      icon="inbox"
      label="Inbox"
      countText={countText(props.entries.length)}
      count={props.entries.length}
      tone="inbox"
      popup={props.entries.length === 0 ? undefined : 'menu'}
    >
      {(controls) => <InboxMenu {...props} controls={controls} />}
    </TopBarPanel>
  )
}

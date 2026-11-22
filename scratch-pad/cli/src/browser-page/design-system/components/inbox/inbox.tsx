import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { navigationClick, type Navigate } from '../../navigation-click'
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

function InboxItem({ entry }: { readonly entry: InboxEntry }) {
  return (
    <>
      <span className="inbox__dot" data-kind={entry.kind} aria-hidden="true" />
      <span className="inbox__main">
        <span className="inbox__head">
          <span className="inbox__what">{headings[entry.kind]}</span>
          {entry.time !== undefined && (
            <time className="inbox__time" dateTime={entry.time}>
              {entry.shownTime}
            </time>
          )}
        </span>
        <span className="inbox__where" data-kind={entry.kind}>
          {entry.where}
        </span>
        {entry.quote !== undefined && (
          <span className="inbox__quote" data-kind={entry.kind}>
            {entry.quote}
          </span>
        )}
        {entry.last !== undefined && <span className="inbox__last">{entry.last}</span>}
      </span>
    </>
  )
}

interface InboxMenuProps extends InboxProps {
  readonly controls: TopBarPanelControls
}

// The menu is only mounted while the panel is open, so the first item is focused each time the
// panel opens.
function InboxMenu({ entries, onNavigate, controls }: InboxMenuProps) {
  const id = useId()
  const [current, setCurrent] = useState(0)
  const links = useRef<(HTMLAnchorElement | null)[]>([])
  useEffect(() => {
    links.current[0]?.focus()
  }, [])
  const focusItem = (index: number): void => {
    setCurrent(index)
    links.current[index]?.focus()
  }
  const move = (event: KeyboardEvent<HTMLUListElement>): void => {
    if (event.key === 'Tab') {
      controls.closeAndFocusButton()
      return
    }
    const last = entries.length - 1
    const targets: Readonly<Record<string, number>> = {
      ArrowDown: current === last ? 0 : current + 1,
      ArrowUp: current === 0 ? last : current - 1,
      Home: 0,
      End: last,
    }
    const target = targets[event.key]
    if (target === undefined) {
      return
    }
    event.preventDefault()
    focusItem(target)
  }
  return (
    <div className="inbox">
      <p className="inbox__title" id={`${id}-title`}>
        Waiting for you
      </p>
      {entries.length === 0 ? (
        <p className="inbox__empty">Nothing waits for you.</p>
      ) : (
        <ul
          className="inbox__list"
          id={controls.popupId}
          role="menu"
          aria-labelledby={`${id}-title`}
          onKeyDown={move}
        >
          {entries.map((entry, index) => (
            <li key={entry.key} role="none">
              <a
                ref={(link) => {
                  links.current[index] = link
                }}
                className="inbox__item"
                role="menuitem"
                tabIndex={index === current ? 0 : -1}
                href={entry.href}
                onClick={(event) => {
                  controls.close()
                  navigationClick(entry.href, onNavigate)(event)
                }}
              >
                <InboxItem entry={entry} />
              </a>
            </li>
          ))}
        </ul>
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

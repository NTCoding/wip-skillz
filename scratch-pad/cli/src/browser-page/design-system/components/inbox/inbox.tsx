import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import { navigationClick, type Navigate } from '../../navigation-click'
import { Icon } from '../icon/icon'
import './inbox.css'

export interface InboxEntry {
  readonly key: string
  readonly href: string
  readonly kind: 'reply' | 'decision'
  readonly where: string
  readonly quote: string
  readonly last: string | undefined
  readonly time: string | undefined
  readonly shownTime: string | undefined
}

interface InboxProps {
  readonly entries: readonly InboxEntry[]
  readonly onNavigate: Navigate
}

const headings = { reply: 'The agent replied', decision: 'A decision to make' } as const

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
        <span className="inbox__where">{entry.where}</span>
        <span className="inbox__quote" data-kind={entry.kind}>
          {entry.quote}
        </span>
        {entry.last !== undefined && <span className="inbox__last">{entry.last}</span>}
      </span>
    </>
  )
}

export function Inbox({ entries, onNavigate }: InboxProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const links = useRef<(HTMLAnchorElement | null)[]>([])
  useEffect(() => {
    if (open) {
      links.current[0]?.focus()
    }
  }, [open])
  const close = (): void => {
    setOpen(false)
    button.current?.focus()
  }
  const focusItem = (index: number): void => {
    setCurrent(index)
    links.current[index]?.focus()
  }
  const move = (event: KeyboardEvent<HTMLUListElement>): void => {
    if (event.key === 'Escape') {
      close()
      return
    }
    if (event.key === 'Tab') {
      setOpen(false)
      button.current?.focus()
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
  const closeWhenFocusLeaves = (event: FocusEvent<HTMLDivElement>): void => {
    if (!root.current?.contains(event.relatedTarget)) {
      setOpen(false)
    }
  }
  return (
    <div ref={root} className="inbox" onBlur={closeWhenFocusLeaves}>
      <button
        ref={button}
        type="button"
        className="inbox__button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        aria-label={`Inbox: ${countText(entries.length)}`}
        onClick={() => {
          setCurrent(0)
          setOpen(!open)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false)
          }
        }}
      >
        <Icon name="inbox" />
        Inbox
        {entries.length > 0 && <span className="inbox__count">{entries.length}</span>}
      </button>
      {open && (
        <div className="inbox__panel">
          <p className="inbox__title" id={`${id}-title`}>
            Waiting for you
          </p>
          {entries.length === 0 ? (
            <p className="inbox__empty">Nothing waits for you.</p>
          ) : (
            <ul
              className="inbox__list"
              id={`${id}-menu`}
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
                      setOpen(false)
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
      )}
    </div>
  )
}

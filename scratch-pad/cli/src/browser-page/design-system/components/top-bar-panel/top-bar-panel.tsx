import { useEffect, useId, useRef, useState, type FocusEvent, type ReactNode } from 'react'
import { Icon, type IconName } from '../icon/icon'
import './top-bar-panel.css'

export interface TopBarPanelControls {
  readonly close: () => void
  readonly closeAndFocusButton: () => void
  // The id that the content puts on the element whose role is the popup, like the menu of the
  // Inbox, because the button's aria-controls points at that element.
  readonly popupId: string
}

// TopBarPanel is a button in the top bar that opens a panel below it, like the Inbox or the
// Outbox. The panel closes when Nick presses Escape or when the focus leaves the button and the
// panel. A panel without a popup is pointed at by aria-controls itself.
interface TopBarPanelProps {
  readonly icon: IconName
  readonly label: string
  readonly countText: string
  readonly count: number
  // If the count is 0 and dot is true, the button will show a red dot without a number. The Inbox
  // shows the dot when pages have been updated but there aren't any items that need an answer.
  readonly dot?: boolean | undefined
  readonly tone: 'inbox' | 'outbox'
  readonly popup?: 'menu' | undefined
  readonly children: (controls: TopBarPanelControls) => ReactNode
}

export function TopBarPanel({
  icon,
  label,
  countText,
  count,
  dot,
  tone,
  popup,
  children,
}: TopBarPanelProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const buttonId = `${id}-button`
  const panelId = `${id}-panel`
  const popupId = `${id}-popup`
  const controlledId = popup === undefined ? panelId : popupId
  const controls: TopBarPanelControls = {
    close: () => setOpen(false),
    closeAndFocusButton: () => {
      setOpen(false)
      document.getElementById(buttonId)?.focus()
    },
    popupId,
  }
  useEffect(() => {
    if (!open) {
      return undefined
    }
    // The listener runs in the capture phase so it runs before the listener of MarginLane. It
    // prevents the default so that the same Escape doesn't close an open card in the margin too.
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        document.getElementById(buttonId)?.focus()
      }
    }
    document.addEventListener('keydown', closeOnEscape, true)
    return () => document.removeEventListener('keydown', closeOnEscape, true)
  }, [open, buttonId])
  const closeWhenFocusLeaves = (event: FocusEvent<HTMLDivElement>): void => {
    if (!root.current?.contains(event.relatedTarget)) {
      setOpen(false)
    }
  }
  return (
    <div ref={root} className="top-bar-panel" onBlur={closeWhenFocusLeaves}>
      <button
        id={buttonId}
        type="button"
        className="top-bar-panel__button"
        aria-haspopup={popup}
        aria-expanded={open}
        aria-controls={open ? controlledId : undefined}
        aria-label={`${label}: ${countText}`}
        onClick={() => setOpen(!open)}
      >
        <Icon name={icon} />
        {label}
        {count > 0 && (
          <span className="top-bar-panel__count" data-tone={tone}>
            {count}
          </span>
        )}
        {count === 0 && dot === true && <span className="top-bar-panel__dot" />}
      </button>
      {open && (
        <div className="top-bar-panel__panel" id={panelId} role="group" aria-label={label}>
          {children(controls)}
        </div>
      )}
    </div>
  )
}

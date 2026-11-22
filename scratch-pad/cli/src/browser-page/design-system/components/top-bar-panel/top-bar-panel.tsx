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
  readonly tone: 'inbox' | 'outbox'
  readonly popup?: 'menu' | undefined
  readonly children: (controls: TopBarPanelControls) => ReactNode
}

export function TopBarPanel({
  icon,
  label,
  countText,
  count,
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
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false)
        document.getElementById(buttonId)?.focus()
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
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
      </button>
      {open && (
        <div className="top-bar-panel__panel" id={panelId} role="group" aria-label={label}>
          {children(controls)}
        </div>
      )}
    </div>
  )
}

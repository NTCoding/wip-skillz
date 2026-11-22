import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { IconButton } from '../icon-button/icon-button'
import { makePageBehindInert } from './page-behind'
import './full-size-view.css'

export interface FullSizeControl {
  readonly open: boolean
  readonly openFullSize: () => void
}

interface FullSizeViewProps {
  readonly label: string
  readonly actions?: ReactNode
  readonly children: ReactNode | ((control: FullSizeControl) => ReactNode)
}

export function FullSizeView({ label, actions, children }: FullSizeViewProps) {
  const [open, setOpen] = useState(false)
  const view = useRef<HTMLDivElement>(null)
  const control = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  useLayoutEffect(() => {
    if (!open) {
      return undefined
    }
    const root = document.documentElement
    const opener = control.current ?? document.querySelector<HTMLElement>(':focus')
    view.current?.showPopover()
    const restorePageBehind = makePageBehindInert(view.current)
    root.dataset['fullSize'] = 'open'
    closeButton.current?.focus()
    // The listener runs in the capture phase and stops the propagation of the Escape that closes the
    // view. So a draft or a reply box in the view doesn't cancel on the same Escape. MarginLane
    // doesn't close the card in the margin on that Escape either.
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        event.preventDefault()
        setOpen(false)
      }
    }
    document.addEventListener('keydown', closeOnEscape, true)
    return () => {
      document.removeEventListener('keydown', closeOnEscape, true)
      restorePageBehind()
      delete root.dataset['fullSize']
      opener?.focus()
    }
  }, [open])
  return (
    <div
      ref={view}
      className={open ? 'full-size-view full-size-view--open' : 'full-size-view'}
      popover={open ? 'manual' : undefined}
      role={open ? 'dialog' : undefined}
      aria-modal={open ? 'true' : undefined}
      aria-label={open ? label : undefined}
    >
      {typeof children !== 'function' && (
        <div className="full-size-view__control">
          {actions}
          <IconButton
            ref={control}
            icon="full-size"
            label={`Open the ${label} at full size`}
            onClick={() => setOpen(true)}
          />
        </div>
      )}
      {open && (
        <div className="full-size-view__head">
          <span className="full-size-view__label">{label}</span>
          <span className="full-size-view__hint">Esc closes this view</span>
          <IconButton
            ref={closeButton}
            icon="close"
            label="Close the full size view"
            onClick={() => setOpen(false)}
          />
        </div>
      )}
      <div className="full-size-view__body">
        {typeof children === 'function'
          ? children({ open, openFullSize: () => setOpen(true) })
          : children}
      </div>
    </div>
  )
}

import { type ReactNode } from 'react'
import { FullSizeView } from '../full-size-view/full-size-view'
import { IconButton } from '../icon-button/icon-button'
import { type ThreadKindName } from '../thread-kind/thread-kind'
import './margin-card.css'

// Every card in the margin has an expand button, which opens the card's own content in the full
// size view. The full size view shows the same content rather than a copy. That's why a reply that
// Nick has started in the card is still there at full size.
interface MarginCardProps {
  readonly label: string
  // The name of the card in the label of the expand button, like c-1 in "Open c-1 at full size"
  readonly name: string
  // The title of the full size view. The label is used as the title by default.
  readonly fullSizeLabel?: string | undefined
  readonly kind: ThreadKindName
  readonly active: boolean
  readonly id?: string
  readonly onFocus?: () => void
  // The buttons after the expand button, like the button that resolves a thread
  readonly tools?: ReactNode
  // A function receives true while the content is shown at full size.
  readonly children: ReactNode | ((fullSize: boolean) => ReactNode)
}

export function MarginCard(props: MarginCardProps) {
  const { label, name, kind, active, id, onFocus, tools, children } = props
  return (
    <section
      id={id}
      tabIndex={-1}
      className="margin-card"
      data-kind={kind}
      data-active={active}
      aria-label={label}
      onFocus={onFocus}
    >
      <FullSizeView label={props.fullSizeLabel ?? label}>
        {({ open, openFullSize }) => (
          <div className="margin-card__content" data-full-size={open}>
            <span className="margin-card__tools">
              <IconButton
                icon="full-size"
                label={`Open ${name} at full size`}
                onClick={openFullSize}
              />
              {tools}
            </span>
            {typeof children === 'function' ? children(open) : children}
          </div>
        )}
      </FullSizeView>
    </section>
  )
}

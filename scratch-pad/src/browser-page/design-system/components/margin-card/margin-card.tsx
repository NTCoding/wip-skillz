import { type ReactNode } from 'react'
import { type ThreadKindName } from '../thread-kind/thread-kind'
import './margin-card.css'

interface MarginCardProps {
  readonly label: string
  readonly kind: ThreadKindName
  readonly active: boolean
  readonly id?: string
  readonly onFocus?: () => void
  readonly children: ReactNode
}

export function MarginCard({ label, kind, active, id, onFocus, children }: MarginCardProps) {
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
      {children}
    </section>
  )
}

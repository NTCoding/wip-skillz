import { type ReactNode } from 'react'
import { type ThreadKindName } from '../thread-kind/thread-kind'
import './highlight.css'

interface HighlightProps {
  readonly threads: readonly string[]
  readonly kind: ThreadKindName
  readonly active: boolean
  readonly children: ReactNode
}

export function Highlight({ threads, kind, active, children }: HighlightProps) {
  return (
    <mark
      className="highlight"
      data-kind={kind}
      data-active={active}
      data-highlight={threads.join(' ')}
    >
      {children}
    </mark>
  )
}

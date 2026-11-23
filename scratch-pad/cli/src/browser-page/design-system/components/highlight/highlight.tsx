import { type ReactNode } from 'react'
import { type ThreadKindName } from '../thread-kind/thread-kind'
import './highlight.css'

// A search match is highlighted after Nick has opened a result of the search. It can cover the text
// of a thread too, which is why it still has the ids of those threads.
interface HighlightProps {
  readonly threads: readonly string[]
  readonly kind: ThreadKindName | 'search'
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

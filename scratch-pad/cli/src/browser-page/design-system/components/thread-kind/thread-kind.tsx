import { Icon } from '../icon/icon'
import './thread-kind.css'

export type ThreadKindName = 'comment' | 'grammar' | 'improvement'

export const threadKindNames: readonly ThreadKindName[] = ['comment', 'grammar', 'improvement']

export const threadKindLabels: Readonly<Record<ThreadKindName, string>> = {
  comment: 'Comment',
  grammar: 'Grammar / tone',
  improvement: 'Improvement',
}

interface ThreadKindProps {
  readonly kind: ThreadKindName
}

export function ThreadKind({ kind }: ThreadKindProps) {
  return (
    <span className="thread-kind" data-kind={kind}>
      <Icon name={kind} />
      {threadKindLabels[kind]}
    </span>
  )
}

import { Icon } from '../icon/icon'
import { type ThreadKindName } from '../thread-kind/thread-kind'
import './margin-marker.css'

interface MarginMarkerProps {
  readonly label: string
  readonly kind: ThreadKindName
  readonly messages: number
  readonly open: boolean
  readonly onClick: () => void
}

export function MarginMarker({ label, kind, messages, open, onClick }: MarginMarkerProps) {
  return (
    <button
      type="button"
      className="margin-marker"
      data-kind={kind}
      aria-label={label}
      aria-expanded={open}
      onClick={onClick}
    >
      <Icon name={kind} />
      {messages > 1 && <span aria-hidden="true">{messages}</span>}
    </button>
  )
}

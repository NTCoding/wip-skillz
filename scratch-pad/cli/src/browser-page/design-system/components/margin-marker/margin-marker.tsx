import { Icon } from '../icon/icon'
import { type ThreadKindName } from '../thread-kind/thread-kind'
import './margin-marker.css'

// A decision's marker shows the icon of a decision with a tick, because only a decision that
// Nick has answered is shown in the margin. A changed marker is beside a section that has changed
// since Nick read it.
interface MarginMarkerProps {
  readonly label: string
  readonly kind: ThreadKindName | 'decision' | 'changed'
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
      <Icon name={kind === 'changed' ? 'text-changed' : kind} />
      {kind === 'decision' && <Icon name="check" />}
      {kind === 'comment' && messages > 1 && <span aria-hidden="true">{messages}</span>}
    </button>
  )
}

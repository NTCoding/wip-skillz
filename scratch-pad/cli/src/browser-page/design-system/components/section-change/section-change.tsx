import { usePendingAction } from '../../pending-action'
import { Button } from '../button/button'
import { Icon } from '../icon/icon'
import { MarginCard } from '../margin-card/margin-card'
import './section-change.css'

interface SectionChangeProps {
  readonly title: string
  // The time that the page's file was last written, as Nick reads it
  readonly shownTime: string
  readonly active: boolean
  readonly onMarkAsRead: () => Promise<void>
}

// The card in the margin beside a section that has changed since Nick read it
export function SectionChange({ title, shownTime, active, onMarkAsRead }: SectionChangeProps) {
  const { pending, problem, run } = usePendingAction(onMarkAsRead)
  return (
    <MarginCard
      label={`${title} has changed`}
      name={`the change to ${title}`}
      kind="comment"
      active={active}
    >
      <div className="section-change">
        <p className="section-change__title">
          <Icon name="text-changed" />
          This section has changed
        </p>
        <p className="section-change__text">
          The agent changed this section at {shownTime}, after you last read it.
        </p>
        <div className="section-change__actions">
          <Button onClick={run} disabled={pending}>
            Mark as read
          </Button>
        </div>
        {problem !== undefined && (
          <p className="section-change__problem" role="alert">
            {problem}
          </p>
        )}
      </div>
    </MarginCard>
  )
}

import { Icon } from '../icon/icon'
import { MarginCard } from '../margin-card/margin-card'
import './section-change.css'

interface SectionChangeProps {
  readonly title: string
  // The time that the page's file was last written, as Nick reads it
  readonly shownTime: string
  readonly active: boolean
  // The problem of the last click that should have marked the section as read, which the card
  // shows with role="alert"
  readonly problem: string | undefined
}

// The card in the margin beside a section that has changed since Nick last read the section. The
// section is marked as read when Nick clicks inside the section on the page.
export function SectionChange({ title, shownTime, active, problem }: SectionChangeProps) {
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
        {problem !== undefined && (
          <p className="section-change__problem" role="alert">
            {problem}
          </p>
        )}
      </div>
    </MarginCard>
  )
}

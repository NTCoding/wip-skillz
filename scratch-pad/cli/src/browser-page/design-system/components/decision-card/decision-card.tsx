import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from '../icon/icon'
import './decision-card.css'

// A round of changes that Nick has asked the agent to make on a decision. A round without an
// outcome waits for the agent. The outcome of a round is the line that the agent wrote when
// reopening the decision.
export interface DecisionCardReview {
  readonly reason: string
  readonly outcome: string | undefined
}

// The state follows the newest round. The rounds are listed oldest first.
function stateOf(answered: boolean, reviews: readonly DecisionCardReview[]): string {
  if (answered) {
    return 'Answered'
  }
  return reviews.at(-1)?.outcome === undefined && reviews.length > 0
    ? 'Changes requested'
    : 'Waiting for Nick'
}

interface DecisionCardProps {
  readonly id: string
  readonly question: string | undefined
  // A few words about the problem and the links to the sections that Nick should read before he
  // decides. A decision on an older page doesn't have a context.
  readonly context: ReactNode
  readonly proposal: ReactNode
  readonly alternative: ReactNode
  readonly pick: ReactNode
  readonly answer: string | undefined
  // A decision page shows the options in its text, so its card doesn't show the fields.
  readonly showFields?: boolean
  // The rounds of changes that Nick has requested, oldest first
  readonly reviews?: readonly DecisionCardReview[] | undefined
  readonly children?: ReactNode
}

export function DecisionCard({
  id,
  question,
  context,
  proposal,
  alternative,
  pick,
  answer,
  showFields = true,
  reviews = [],
  children,
}: DecisionCardProps) {
  const answered = answer !== undefined
  const answerText = useRef<HTMLParagraphElement>(null)
  const answeredBefore = useRef(answered)
  useEffect(() => {
    if (answered && !answeredBefore.current) {
      answerText.current?.focus({ preventScroll: true })
    }
    answeredBefore.current = answered
  }, [answered])
  return (
    <section
      className="decision-card"
      data-answered={answered}
      aria-label={`Decision ${id}`}
      data-decision={id}
    >
      <p className="decision-card__head">
        <Icon name="decision" />
        <span className="decision-card__kind">Decision for Nick</span>
        <span className="decision-card__state">{stateOf(answered, reviews)}</span>
      </p>
      {question !== undefined && <p className="decision-card__question">{question}</p>}
      {showFields && context !== undefined && (
        <div className="decision-card__context">
          <p className="decision-card__label">Context</p>
          {context}
        </div>
      )}
      {showFields && (
        <dl className="decision-card__fields">
          <dt>Proposal</dt>
          <dd>{proposal}</dd>
          <dt>Alternative</dt>
          <dd>{alternative}</dd>
          <dt>The agent&apos;s pick</dt>
          <dd>{pick}</dd>
        </dl>
      )}
      {answered && (
        <p ref={answerText} className="decision-card__answer" tabIndex={-1} role="status">
          Nick&apos;s answer: {answer}
        </p>
      )}
      {reviews.length > 0 && (
        <ol className="decision-card__reviews" data-waiting={reviews.at(-1)?.outcome === undefined}>
          {reviews.map((review, index) => (
            <li key={index} className="decision-card__review">
              <p className="decision-card__review-reason">
                Nick requested changes: {review.reason}
              </p>
              {review.outcome !== undefined && (
                <p className="decision-card__review-outcome">
                  The agent changed the page: {review.outcome}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
      {children}
    </section>
  )
}

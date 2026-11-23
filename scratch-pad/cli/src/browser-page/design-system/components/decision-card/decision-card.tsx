import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from '../icon/icon'
import './decision-card.css'

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
        <span className="decision-card__state">{answered ? 'Answered' : 'Waiting for Nick'}</span>
      </p>
      {question !== undefined && <p className="decision-card__question">{question}</p>}
      {context !== undefined && (
        <div className="decision-card__context">
          <p className="decision-card__label">Context</p>
          {context}
        </div>
      )}
      <dl className="decision-card__fields">
        <dt>Proposal</dt>
        <dd>{proposal}</dd>
        <dt>Alternative</dt>
        <dd>{alternative}</dd>
        <dt>The agent&apos;s pick</dt>
        <dd>{pick}</dd>
      </dl>
      {answered && (
        <p ref={answerText} className="decision-card__answer" tabIndex={-1} role="status">
          Nick&apos;s answer: {answer}
        </p>
      )}
      {children}
    </section>
  )
}

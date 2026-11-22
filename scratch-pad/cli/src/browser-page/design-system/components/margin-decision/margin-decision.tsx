import { type ReactNode } from 'react'
import { FullSizeView } from '../full-size-view/full-size-view'
import { Icon } from '../icon/icon'
import { IconButton } from '../icon-button/icon-button'
import { MarginCard } from '../margin-card/margin-card'
import { MarginMarker } from '../margin-marker/margin-marker'
import './margin-decision.css'

// A decision that Nick has answered is shown in the margin beside its question rather than in the
// text. Its marker opens the card of the decision below the marker, and the card can be opened at
// full size. In a narrow reading column, MarginLane shows the marker beside the text instead, so
// this marker is hidden there.
interface MarginDecisionProps {
  readonly id: string
  readonly question: string
  readonly proposal: ReactNode
  readonly alternative: ReactNode
  readonly pick: ReactNode
  readonly answer: string
  // The paragraphs between the question and the decision, which the full size view shows below
  // the question
  readonly context: readonly string[]
  readonly open: boolean
  readonly onToggle: () => void
}

interface DecisionContentProps extends Omit<MarginDecisionProps, 'open' | 'onToggle'> {
  readonly fullSize: boolean
}

function DecisionContent(props: DecisionContentProps) {
  const { fullSize } = props
  return (
    <>
      <p className="margin-decision__head">
        <Icon name="decision" />
        <span className="margin-decision__kind">{fullSize ? 'Decision for Nick' : 'Decision'}</span>
        <span className="margin-decision__state">Answered</span>
      </p>
      {fullSize ? (
        <h2 className="margin-decision__question">{props.question}</h2>
      ) : (
        <p className="margin-decision__question">{props.question}</p>
      )}
      {fullSize &&
        props.context.map((paragraph, index) => (
          <p key={index} className="margin-decision__context">
            {paragraph}
          </p>
        ))}
      <dl className="margin-decision__fields">
        <div>
          <dt>Proposal</dt>
          <dd>{props.proposal}</dd>
        </div>
        <div>
          <dt>Alternative</dt>
          <dd>{props.alternative}</dd>
        </div>
        <div>
          <dt>The agent&apos;s pick</dt>
          <dd>{props.pick}</dd>
        </div>
      </dl>
      <p className="margin-decision__answer" role="status">
        {fullSize && <Icon name="check" />}
        Nick&apos;s answer: {props.answer}
      </p>
    </>
  )
}

export function MarginDecision({ open, onToggle, ...decision }: MarginDecisionProps) {
  const { id } = decision
  return (
    <div className="margin-decision">
      <span className="margin-decision__marker">
        <MarginMarker
          label={`Decision ${id}`}
          kind="decision"
          messages={1}
          open={open}
          onClick={onToggle}
        />
      </span>
      {open && (
        <MarginCard id={id} label={`Decision ${id}`} kind="comment" active>
          <FullSizeView label={`Decision: ${decision.question}`}>
            {({ open: fullSize, openFullSize }) => (
              <div className="margin-decision__card" data-full-size={fullSize}>
                <span className="margin-decision__tools">
                  <IconButton
                    icon="full-size"
                    label={`Open ${id} at full size`}
                    onClick={openFullSize}
                  />
                  <IconButton icon="close" label={`Close ${id}`} onClick={onToggle} />
                </span>
                <DecisionContent {...decision} fullSize={fullSize} />
              </div>
            )}
          </FullSizeView>
        </MarginCard>
      )}
    </div>
  )
}

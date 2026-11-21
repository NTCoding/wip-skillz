import { useState } from 'react'
import { Button } from '../button/button'
import { MessageBox, problemOf } from '../message-box/message-box'
import './decision-answer-form.css'

export type DecisionAnswer =
  { readonly choice: 'proposal' | 'alternative' } | { readonly written: string }

interface DecisionAnswerFormProps {
  readonly onAnswer: (answer: DecisionAnswer) => Promise<void>
}

export function DecisionAnswerForm({ onAnswer }: DecisionAnswerFormProps) {
  const [pending, setPending] = useState(false)
  const [problem, setProblem] = useState<string | undefined>(undefined)
  const choose = (choice: 'proposal' | 'alternative'): void => {
    setPending(true)
    setProblem(undefined)
    onAnswer({ choice })
      .catch((error: unknown) => setProblem(problemOf(error)))
      .finally(() => setPending(false))
  }
  return (
    <div className="decision-answer-form">
      <div className="decision-answer-form__choices" role="group" aria-label="Answer the decision">
        <Button variant="primary" onClick={() => choose('proposal')} disabled={pending}>
          Proposal
        </Button>
        <Button onClick={() => choose('alternative')} disabled={pending}>
          Alternative
        </Button>
      </div>
      {problem !== undefined && (
        <p className="decision-answer-form__problem" role="alert">
          {problem}
        </p>
      )}
      <MessageBox
        label="Answer in your own words…"
        submitLabel="Send"
        onSubmit={(written) => onAnswer({ written })}
      />
    </div>
  )
}

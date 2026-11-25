import { useState } from 'react'
import { Button } from '../button/button'
import { MessageBox, problemOf } from '../message-box/message-box'
import './decision-answer-form.css'

export type DecisionAnswer = { readonly choice: string } | { readonly written: string }

// A button that chooses an option. The choice is the value that the server stores. A decision page
// has a numbered option for each option on the page, whereas an inline block has a proposal and
// an alternative.
export interface DecisionOption {
  readonly choice: string
  readonly label: string
}

const inlineOptions: readonly DecisionOption[] = [
  { choice: 'proposal', label: 'Proposal' },
  { choice: 'alternative', label: 'Alternative' },
]

// Nick can ask the agent to change the page instead of choosing an option. He has to write a
// reason. The button is only shown when the form has the function for it.
interface DecisionAnswerFormProps {
  readonly onAnswer: (answer: DecisionAnswer) => Promise<void>
  readonly options?: readonly DecisionOption[] | undefined
  readonly onRequestChanges?: ((reason: string) => Promise<void>) | undefined
}

function ReasonBox(props: {
  readonly onSend: (reason: string) => Promise<void>
  readonly onClose: () => void
}) {
  return (
    <MessageBox
      label="What has to change on the page?"
      submitLabel="Request changes"
      onSubmit={async (reason) => {
        await props.onSend(reason)
        props.onClose()
      }}
      onCancel={props.onClose}
      focusOnMount
    />
  )
}

export function DecisionAnswerForm({
  onAnswer,
  options = inlineOptions,
  onRequestChanges,
}: DecisionAnswerFormProps) {
  const [askingForChanges, setAskingForChanges] = useState(false)
  const [pending, setPending] = useState(false)
  const [problem, setProblem] = useState<string | undefined>(undefined)
  const choose = (choice: string): void => {
    setPending(true)
    setProblem(undefined)
    onAnswer({ choice })
      .catch((error: unknown) => setProblem(problemOf(error)))
      .finally(() => setPending(false))
  }
  return (
    <div className="decision-answer-form">
      <div className="decision-answer-form__choices" role="group" aria-label="Answer the decision">
        {options.map((option, index) => (
          <Button
            key={option.choice}
            variant={options === inlineOptions && index === 0 ? 'primary' : 'quiet'}
            onClick={() => choose(option.choice)}
            disabled={pending}
          >
            {option.label}
          </Button>
        ))}
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
      {onRequestChanges !== undefined && !askingForChanges && (
        <div className="decision-answer-form__choices">
          <Button onClick={() => setAskingForChanges(true)} disabled={pending}>
            Request changes
          </Button>
        </div>
      )}
      {onRequestChanges !== undefined && askingForChanges && (
        <ReasonBox onSend={onRequestChanges} onClose={() => setAskingForChanges(false)} />
      )}
    </div>
  )
}

import {
  DecisionAnswerForm,
  type DecisionAnswer,
  type DecisionOption,
} from './design-system/design-system'

type SendBack = ((id: string, reason: string) => Promise<void>) | undefined

export interface DecisionFormActions {
  readonly onAnswerDecision: ((id: string, answer: DecisionAnswer) => Promise<void>) | undefined
  readonly onRequestDecisionChanges: SendBack
}

function reasonSender(id: string, send: SendBack): ((reason: string) => Promise<void>) | undefined {
  return send === undefined ? undefined : (reason) => send(id, reason)
}

// The form of a decision that Nick can still decide. A page that is read only, like the export,
// doesn't have the function to answer, so it doesn't show the form.
export function DecisionForm(props: {
  readonly id: string
  // The options of a decision page. An inline block has a proposal and an alternative.
  readonly options?: readonly DecisionOption[] | undefined
  readonly actions: DecisionFormActions
}) {
  const { id, actions } = props
  const { onAnswerDecision } = actions
  return onAnswerDecision === undefined ? null : (
    <DecisionAnswerForm
      onAnswer={(chosen) => onAnswerDecision(id, chosen)}
      options={props.options}
      onRequestChanges={reasonSender(id, actions.onRequestDecisionChanges)}
    />
  )
}

import './decision-page-status.css'

export type DecisionPageState = 'draft' | 'open' | 'changes-requested' | 'decided'

const labels: Readonly<Record<DecisionPageState, string>> = {
  draft: 'Draft',
  open: 'Open',
  'changes-requested': 'Changes requested',
  decided: 'Decided',
}

// The status of a decision page, which is shown under the title of the page. The server never
// writes the status into the file, because the status follows what Nick and the agent have done.
export function DecisionPageStatus({ state }: { readonly state: DecisionPageState }) {
  return (
    <p className="decision-page-status" data-state={state}>
      Status: <strong>{labels[state]}</strong>
    </p>
  )
}

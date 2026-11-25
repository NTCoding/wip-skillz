import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DecisionForm, type DecisionFormActions } from './decision-form'

function actions(changes: Partial<DecisionFormActions> = {}): DecisionFormActions {
  return {
    onAnswerDecision: () => Promise.resolve(),
    onRequestDecisionChanges: undefined,
    ...changes,
  }
}

describe('DecisionForm', () => {
  it('passes the id of the decision and the reason when Nick requests changes', async () => {
    const onRequestDecisionChanges = vi.fn<(id: string, reason: string) => Promise<void>>(() =>
      Promise.resolve(),
    )
    render(<DecisionForm id="d-3" actions={actions({ onRequestDecisionChanges })} />)

    await userEvent.click(screen.getByRole('button', { name: 'Request changes' }))
    await userEvent.type(screen.getByRole('textbox', { name: /^What/ }), 'Name the team.{Enter}')

    expect(onRequestDecisionChanges).toHaveBeenCalledWith('d-3', 'Name the team.')
  })

  it('doesn’t show the button that requests changes when the page doesn’t have the function', () => {
    render(<DecisionForm id="d-3" actions={actions()} />)

    expect(screen.getByRole('button', { name: 'Proposal' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Request changes' })).toBeNull()
  })

  it('shows nothing when the page is read only', () => {
    const { container } = render(
      <DecisionForm id="d-3" actions={actions({ onAnswerDecision: undefined })} />,
    )

    expect(container.textContent).toBe('')
  })
})

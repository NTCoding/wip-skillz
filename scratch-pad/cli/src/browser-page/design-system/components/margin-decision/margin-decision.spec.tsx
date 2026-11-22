import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MarginDecision } from './margin-decision'

function renderDecision(open: boolean, onToggle: () => void = () => undefined) {
  render(
    <MarginDecision
      id="d-1"
      question="Will the export job retry 8 times?"
      proposal="Raise the retry limit to 8."
      alternative="Keep the retry limit at 5."
      pick="proposal, because the network of a shop can be slow."
      answer="proposal"
      context={['The network of a small shop can be slow in the evening.']}
      open={open}
      onToggle={onToggle}
    />,
  )
}

describe('MarginDecision', () => {
  it('only shows the marker of the decision when the decision is closed', () => {
    renderDecision(false)
    expect(screen.getByRole('button', { name: 'Decision d-1', expanded: false })).toBeDefined()
    expect(screen.queryByRole('region')).toBeNull()
  })

  it('shows the question, the fields and Nick’s answer in the card when the decision is open', () => {
    renderDecision(true)
    const card = screen.getByRole('region', { name: 'Decision d-1' })
    expect(card.id).toBe('d-1')
    expect(card.textContent).toBe(
      [
        'DecisionAnswered',
        'Will the export job retry 8 times?',
        'ProposalRaise the retry limit to 8.',
        'AlternativeKeep the retry limit at 5.',
        "The agent's pickproposal, because the network of a shop can be slow.",
        "Nick's answer: proposal",
      ].join(''),
    )
  })

  it('calls onToggle when Nick clicks the marker or the close button', async () => {
    const onToggle = vi.fn<() => void>()
    renderDecision(true, onToggle)
    await userEvent.click(screen.getByRole('button', { name: 'Decision d-1', expanded: true }))
    await userEvent.click(screen.getByRole('button', { name: 'Close d-1' }))
    expect(onToggle).toHaveBeenCalledTimes(2)
  })

  it('shows the decision with the text under its question when Nick opens it at full size', async () => {
    renderDecision(true)
    await userEvent.click(screen.getByRole('button', { name: 'Open d-1 at full size' }))
    const view = screen.getByRole('dialog', {
      name: 'Decision: Will the export job retry 8 times?',
    })
    expect(
      within(view).getByRole('heading', { name: 'Will the export job retry 8 times?' }),
    ).toBeDefined()
    expect(view.textContent).toContain(
      'Decision for NickAnsweredWill the export job retry 8 times?The network of a small shop can be slow in the evening.',
    )
    expect(within(view).queryByRole('button', { name: 'Close d-1' })).toBeNull()
  })

  it('gives the focus back to the full size button when Nick closes the full size view', async () => {
    renderDecision(true)
    const control = screen.getByRole('button', { name: 'Open d-1 at full size' })
    await userEvent.click(control)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(control)
  })

  it('shows the card again when Nick closes the full size view', async () => {
    renderDecision(true)
    await userEvent.click(screen.getByRole('button', { name: 'Open d-1 at full size' }))
    await userEvent.click(screen.getByRole('button', { name: 'Close the full size view' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'Close d-1' })).toBeDefined()
  })
})

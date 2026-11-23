import { render, screen } from '@testing-library/react'
import { type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { DecisionCard } from './decision-card'

function renderCard(
  answer: string | undefined,
  question: string | undefined,
  context: ReactNode = undefined,
) {
  render(
    <DecisionCard
      id="d-1"
      question={question}
      context={context}
      proposal="Raise the retry limit to 8."
      alternative="Keep the retry limit at 5."
      pick="The proposal."
      answer={answer}
    >
      <p>Actions</p>
    </DecisionCard>,
  )
  return screen.getByRole('region', { name: 'Decision d-1' })
}

describe('DecisionCard', () => {
  it('shows the question, the 3 fields and that it waits for Nick when it isn’t answered', () => {
    const card = renderCard(undefined, 'Will the export job retry 8 times?')
    expect(card.getAttribute('data-answered')).toBe('false')
    expect(card.textContent).toContain('Waiting for Nick')
    expect(card.textContent).toContain('Will the export job retry 8 times?')
    expect([
      card.querySelectorAll('dt').length,
      card.textContent.includes('Context'),
    ]).toStrictEqual([3, false])
  })

  it('shows the context under its label above the fields when the agent has written one', () => {
    const card = renderCard(
      undefined,
      'Will the export job retry 8 times?',
      <>
        <p>A slow network in the evening can make an upload fail.</p>
        <ol>
          <li>How the job runs</li>
          <li>The retry limit</li>
        </ol>
      </>,
    )
    const context = card.querySelector('.decision-card__context')
    expect(context?.textContent).toBe(
      'ContextA slow network in the evening can make an upload fail.How the job runsThe retry limit',
    )
    expect(context?.nextElementSibling?.tagName).toBe('DL')
  })

  it('shows Nick’s answer when the decision is answered', () => {
    const card = renderCard('proposal', undefined)
    expect(card.getAttribute('data-answered')).toBe('true')
    expect(card.textContent).toContain("Nick's answer: proposal")
    expect(card.querySelector('.decision-card__question')).toBeNull()
  })

  it('moves the focus to Nick’s answer when the answer arrives while the card is shown', () => {
    const card = (answer: string | undefined): ReactNode => (
      <DecisionCard
        id="d-1"
        question="Will the export job retry 8 times?"
        context={undefined}
        proposal="Raise the retry limit to 8."
        alternative="Keep the retry limit at 5."
        pick="The proposal."
        answer={answer}
      />
    )
    const { rerender } = render(card(undefined))
    rerender(card('alternative'))
    expect(document.activeElement?.textContent).toBe("Nick's answer: alternative")
  })

  it('leaves the focus alone when the card is first shown with an answer', () => {
    renderCard('proposal', undefined)
    expect(document.activeElement).toBe(document.body)
  })
})

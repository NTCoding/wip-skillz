import { render, screen, within } from '@testing-library/react'
import { type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { DecisionCard, type DecisionCardReview } from './decision-card'

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

  it('leaves out the context and the 3 fields when the card is the card of a decision page', () => {
    render(
      <DecisionCard
        id="d-1"
        question={undefined}
        context={<p>The problem.</p>}
        proposal="Raise the retry limit to 8."
        alternative="Keep the retry limit at 5."
        pick="The proposal."
        answer={undefined}
        showFields={false}
      />,
    )
    const card = screen.getByRole('region', { name: 'Decision d-1' })

    expect(card.querySelectorAll('dt')).toHaveLength(0)
    expect(card.textContent).not.toContain('The problem.')
  })

  describe('a decision that Nick has asked the agent to change', () => {
    function renderReviewed(reviews: readonly DecisionCardReview[]) {
      render(
        <DecisionCard
          id="d-1"
          question="Will the export job retry 8 times?"
          context={undefined}
          proposal="Raise the retry limit to 8."
          alternative="Keep the retry limit at 5."
          pick="The proposal."
          answer={undefined}
          reviews={reviews}
        />,
      )
      return screen.getByRole('region', { name: 'Decision d-1' })
    }

    it('shows that changes are requested with the reason of Nick', () => {
      const card = renderReviewed([{ reason: 'Who is the team?', outcome: undefined }])
      expect(card.textContent).toContain('Changes requested')
      expect(card.textContent).toContain('Nick requested changes: Who is the team?')
      expect(card.textContent).not.toContain('The agent changed the page')
    })

    it('shows that the decision waits for Nick again with the line of the agent when the agent has reopened it', () => {
      const card = renderReviewed([
        { reason: 'Who is the team?', outcome: 'Added who the team is.' },
      ])
      expect(card.textContent).toContain('Waiting for Nick')
      expect(card.textContent).toContain('The agent changed the page: Added who the team is.')
    })

    it('lists every round oldest first with its reason and its outcome', () => {
      const card = renderReviewed([
        { reason: 'Who is the team?', outcome: 'Added who the team is.' },
        { reason: 'Say which person.', outcome: undefined },
      ])
      expect(
        within(card)
          .getAllByRole('listitem')
          .map((round) => round.textContent),
      ).toStrictEqual([
        'Nick requested changes: Who is the team?The agent changed the page: Added who the team is.',
        'Nick requested changes: Say which person.',
      ])
      expect(card.textContent).toContain('Changes requested')
    })
  })
})

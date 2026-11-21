import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DecisionAnswerForm, type DecisionAnswer } from './decision-answer-form'

class UnknownDecisionError extends Error {}

describe('DecisionAnswerForm', () => {
  it('answers with the proposal or the alternative when Nick presses its button', async () => {
    const onAnswer = vi.fn<(answer: DecisionAnswer) => Promise<void>>(() => Promise.resolve())
    render(<DecisionAnswerForm onAnswer={onAnswer} />)
    await userEvent.click(screen.getByRole('button', { name: 'Proposal' }))
    await userEvent.click(screen.getByRole('button', { name: 'Alternative' }))
    expect(onAnswer.mock.calls).toStrictEqual([
      [{ choice: 'proposal' }],
      [{ choice: 'alternative' }],
    ])
  })

  it('answers with Nick’s own text when Nick writes an answer', async () => {
    const onAnswer = vi.fn<(answer: DecisionAnswer) => Promise<void>>(() => Promise.resolve())
    render(<DecisionAnswerForm onAnswer={onAnswer} />)
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Answer in your own words…' }),
      'Retry 6 times.{Enter}',
    )
    expect(onAnswer).toHaveBeenCalledWith({ written: 'Retry 6 times.' })
  })

  it('shows the problem and lets Nick try again when the server refuses the answer', async () => {
    render(
      <DecisionAnswerForm
        onAnswer={() => Promise.reject(new UnknownDecisionError('There isn’t any decision d-1.'))}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Proposal' }))
    expect((await screen.findByRole('alert')).textContent).toBe('There isn’t any decision d-1.')
    expect(screen.getByRole('button', { name: 'Proposal' })).toHaveProperty('disabled', false)
  })
})

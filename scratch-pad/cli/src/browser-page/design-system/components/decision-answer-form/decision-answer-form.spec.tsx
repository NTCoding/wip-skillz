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

  it('shows the proposal as the primary button and the alternative as a quiet button', () => {
    render(<DecisionAnswerForm onAnswer={() => Promise.resolve()} />)

    expect(screen.getByRole('button', { name: 'Proposal' }).className).toContain('button--primary')
    expect(screen.getByRole('button', { name: 'Alternative' }).className).toContain('button--quiet')
  })

  describe('a decision page with numbered options', () => {
    const options = [
      { choice: 'option-1', label: 'Option 1: Wait 30 seconds' },
      { choice: 'option-2', label: 'Option 2: Double the wait' },
      { choice: 'option-3', label: 'Option 3: Stop retrying' },
    ]

    it('shows a button for each option instead of the proposal and the alternative', () => {
      render(<DecisionAnswerForm onAnswer={() => Promise.resolve()} options={options} />)

      expect(screen.getAllByRole('button').map((button) => button.textContent)).toStrictEqual([
        'Option 1: Wait 30 seconds',
        'Option 2: Double the wait',
        'Option 3: Stop retrying',
      ])
      expect(screen.queryByRole('button', { name: 'Proposal' })).toBeNull()
    })

    it('shows every option button in the same way because the page doesn’t rank the options', () => {
      render(<DecisionAnswerForm onAnswer={() => Promise.resolve()} options={options} />)

      expect(
        screen.getAllByRole('button').map((button) => button.classList.contains('button--primary')),
      ).toStrictEqual([false, false, false])
    })

    it('answers with the choice of the option that Nick presses', async () => {
      const onAnswer = vi.fn<(answer: DecisionAnswer) => Promise<void>>(() => Promise.resolve())
      render(<DecisionAnswerForm onAnswer={onAnswer} options={options} />)

      await userEvent.click(screen.getByRole('button', { name: 'Option 2: Double the wait' }))

      expect(onAnswer).toHaveBeenCalledWith({ choice: 'option-2' })
    })
  })

  describe('asking for changes', () => {
    const asked = () => Promise.resolve()

    it('doesn’t show the button when the form doesn’t have the function', () => {
      render(<DecisionAnswerForm onAnswer={asked} />)
      expect(screen.queryByRole('button', { name: 'Request changes' })).toBeNull()
    })

    it('disables the button while an answer is being sent', async () => {
      render(
        <DecisionAnswerForm
          onAnswer={() => new Promise(() => undefined)}
          onRequestChanges={asked}
        />,
      )
      await userEvent.click(screen.getByRole('button', { name: 'Proposal' }))
      expect(screen.getByRole('button', { name: 'Request changes' })).toHaveProperty(
        'disabled',
        true,
      )
    })

    it('requests changes with the reason that Nick writes and closes the box', async () => {
      const onRequestChanges = vi.fn<(reason: string) => Promise<void>>(asked)
      render(<DecisionAnswerForm onAnswer={asked} onRequestChanges={onRequestChanges} />)
      await userEvent.click(screen.getByRole('button', { name: 'Request changes' }))
      await userEvent.type(
        screen.getByRole('textbox', { name: 'What has to change on the page?' }),
        'The options don’t say who the team is.{Enter}',
      )
      expect(onRequestChanges).toHaveBeenCalledWith('The options don’t say who the team is.')
      expect(screen.queryByRole('textbox', { name: 'What has to change on the page?' })).toBeNull()
    })

    it('doesn’t send anything when Nick cancels', async () => {
      const onRequestChanges = vi.fn<(reason: string) => Promise<void>>(asked)
      render(<DecisionAnswerForm onAnswer={asked} onRequestChanges={onRequestChanges} />)
      await userEvent.click(screen.getByRole('button', { name: 'Request changes' }))
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(onRequestChanges).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'Request changes' })).toBeDefined()
    })
  })
})

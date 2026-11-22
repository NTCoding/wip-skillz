import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MarginCard } from './margin-card'

describe('MarginCard', () => {
  it('calls onFocus when something inside the card has the focus', async () => {
    const onFocus = vi.fn()
    render(
      <MarginCard
        label="Comment c-1"
        name="c-1"
        kind="comment"
        active={false}
        id="c-1"
        onFocus={onFocus}
      >
        <button type="button">Reply</button>
      </MarginCard>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Reply' }))
    expect(onFocus).toHaveBeenCalledWith(expect.objectContaining({ type: 'focus' }))
  })

  it('is a region with the id of its thread that a script can focus when the card is shown', () => {
    render(
      <MarginCard label="Grammar / tone g-1" name="g-1" kind="grammar" active>
        <p>Write who will change the template.</p>
      </MarginCard>,
    )
    const card = screen.getByRole('region', { name: 'Grammar / tone g-1' })
    expect(card.getAttribute('tabindex')).toBe('-1')
    expect(card.getAttribute('data-active')).toBe('true')
  })

  it('opens its own content under its label at full size and gives the focus back to the expand button after Escape', async () => {
    render(
      <MarginCard label="Comment in the outbox" name="the comment" kind="comment" active>
        <p>Is 5 retries enough?</p>
      </MarginCard>,
    )
    const expand = screen.getByRole('button', { name: 'Open the comment at full size' })
    await userEvent.click(expand)
    const view = screen.getByRole('dialog', { name: 'Comment in the outbox' })
    expect(within(view).getByText('Is 5 retries enough?')).toBeDefined()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(expand)
  })

  it('shows the tools after the expand button and tells the content when it is at full size', async () => {
    render(
      <MarginCard
        label="Decision d-1"
        name="d-1"
        fullSizeLabel="Decision: Will the export job retry 8 times?"
        kind="comment"
        active
        tools={<button type="button">Close d-1</button>}
      >
        {(fullSize) => <p>{fullSize ? 'The whole decision' : 'The decision in short'}</p>}
      </MarginCard>,
    )
    expect(
      screen
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label') ?? button.textContent),
    ).toStrictEqual(['Open d-1 at full size', 'Close d-1'])
    expect(screen.getByText('The decision in short')).toBeDefined()
    await userEvent.click(screen.getByRole('button', { name: 'Open d-1 at full size' }))
    const view = screen.getByRole('dialog', {
      name: 'Decision: Will the export job retry 8 times?',
    })
    expect(within(view).getByText('The whole decision')).toBeDefined()
  })
})

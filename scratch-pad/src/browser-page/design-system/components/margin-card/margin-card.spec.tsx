import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MarginCard } from './margin-card'

describe('MarginCard', () => {
  it('calls onFocus when something inside the card has the focus', async () => {
    const onFocus = vi.fn()
    render(
      <MarginCard label="Comment c-1" kind="comment" active={false} id="c-1" onFocus={onFocus}>
        <button type="button">Reply</button>
      </MarginCard>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Reply' }))
    expect(onFocus).toHaveBeenCalledWith(expect.objectContaining({ type: 'focus' }))
  })

  it('is a region with the id of its thread that a script can focus when the card is shown', () => {
    render(
      <MarginCard label="Grammar / tone g-1" kind="grammar" active>
        <p>Write who will change the template.</p>
      </MarginCard>,
    )
    const card = screen.getByRole('region', { name: 'Grammar / tone g-1' })
    expect(card.getAttribute('tabindex')).toBe('-1')
    expect(card.getAttribute('data-active')).toBe('true')
  })
})

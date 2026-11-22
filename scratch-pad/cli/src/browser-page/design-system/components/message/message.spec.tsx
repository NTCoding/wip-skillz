import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Message } from './message'

describe('Message', () => {
  it('shows the first letter of the author, the author, the time and the text', () => {
    const { container } = render(
      <Message
        author="agent"
        text="I have raised the retry limit to 8."
        time="2026-11-20T21:12:00.000Z"
        shownTime="20 Nov, 21:12"
      />,
    )
    expect(container.textContent).toBe('AAgent20 Nov, 21:12I have raised the retry limit to 8.')
    expect(container.querySelector('time')?.getAttribute('datetime')).toBe(
      '2026-11-20T21:12:00.000Z',
    )
  })

  it('shows the editor in place of the text when Nick edits the message', () => {
    render(
      <Message
        author="nick"
        text="Is 5 retries enough?"
        time="2026-11-20T21:09:00.000Z"
        shownTime="20 Nov, 21:09"
        editor={<textarea aria-label="Edit the comment" defaultValue="Is 5 retries enough?" />}
      />,
    )
    expect(screen.getByRole('textbox', { name: 'Edit the comment' })).toBeDefined()
    expect(screen.queryByText('Is 5 retries enough?', { selector: 'p' })).toBeNull()
  })
})

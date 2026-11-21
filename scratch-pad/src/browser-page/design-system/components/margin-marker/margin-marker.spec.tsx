import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MarginMarker } from './margin-marker'

describe('MarginMarker', () => {
  it('shows the icon of the kind and the number of messages when the thread has replies', () => {
    render(
      <MarginMarker
        label="Comment c-1"
        kind="comment"
        messages={3}
        open={false}
        onClick={() => undefined}
      />,
    )
    const marker = screen.getByRole('button', { name: 'Comment c-1', expanded: false })
    expect(marker.textContent).toBe('3')
    expect(marker.querySelector('svg')).not.toBeNull()
  })

  it('leaves out the number when the thread only has one message', () => {
    render(
      <MarginMarker
        label="Grammar / tone g-1"
        kind="grammar"
        messages={1}
        open
        onClick={() => undefined}
      />,
    )
    const marker = screen.getByRole('button', { name: 'Grammar / tone g-1', expanded: true })
    expect(marker.textContent).toBe('')
    expect(marker.getAttribute('data-kind')).toBe('grammar')
  })

  it('calls onClick when Nick clicks the marker', async () => {
    const onClick = vi.fn<() => void>()
    render(
      <MarginMarker
        label="Comment c-1"
        kind="comment"
        messages={1}
        open={false}
        onClick={onClick}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Comment c-1' }))
    expect(onClick).toHaveBeenCalledOnce()
  })
})

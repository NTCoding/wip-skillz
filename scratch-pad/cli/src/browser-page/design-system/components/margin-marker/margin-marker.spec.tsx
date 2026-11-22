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

  it('leaves out the number when the thread is a grammar note, even with replies', () => {
    render(
      <MarginMarker
        label="Grammar / tone g-1"
        kind="grammar"
        messages={3}
        open
        onClick={() => undefined}
      />,
    )
    const marker = screen.getByRole('button', { name: 'Grammar / tone g-1', expanded: true })
    expect(marker.textContent).toBe('')
    expect(marker.getAttribute('data-kind')).toBe('grammar')
  })

  it('shows the icon of a decision with a tick when the marker is for a decision', () => {
    render(
      <MarginMarker
        label="Decision d-1"
        kind="decision"
        messages={1}
        open={false}
        onClick={() => undefined}
      />,
    )
    const marker = screen.getByRole('button', { name: 'Decision d-1' })
    expect(marker.querySelectorAll('svg')).toHaveLength(2)
    expect(marker.getAttribute('data-kind')).toBe('decision')
  })

  it('shows the icon of a changed text when the marker is for a changed section', () => {
    const changedIcon = 'M8 2.5l6 11H2zM8 6.5v3.5M8 12h.01'
    render(
      <MarginMarker
        label="Retry limit has changed"
        kind="changed"
        messages={1}
        open={false}
        onClick={() => undefined}
      />,
    )
    const marker = screen.getByRole('button', { name: 'Retry limit has changed' })
    expect(marker.querySelector('path')?.getAttribute('d')).toBe(changedIcon)
    expect(marker.textContent).toBe('')
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

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { IconButton } from './icon-button'

describe('IconButton', () => {
  it('is named by its label when only an icon is shown', () => {
    render(<IconButton icon="copy" label="Copy the code" onClick={() => undefined} />)
    expect(screen.getByRole('button', { name: 'Copy the code' }).textContent).toBe('')
  })

  it('calls onClick when Nick presses the button', async () => {
    const onClick = vi.fn<() => void>()
    render(<IconButton icon="close" label="Close" onClick={onClick} />)
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClick).toHaveBeenCalledWith()
  })

  it('tells assistive technology that it is pressed when pressed is true', () => {
    render(<IconButton icon="sun" label="Light" onClick={() => undefined} pressed tone="code" />)
    expect(screen.getByRole('button', { name: 'Light', pressed: true }).className).toBe(
      'icon-button icon-button--code',
    )
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DraftToggle } from './draft-toggle'

describe('DraftToggle', () => {
  it('toggles draft mode when clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DraftToggle enabled={false} onChange={onChange} />)

    const toggle = screen.getByRole('switch', { name: 'Draft mode' })
    expect(toggle.getAttribute('aria-checked')).toBe('false')

    await user.click(toggle)
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('shows the active state when enabled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DraftToggle enabled={true} onChange={onChange} />)

    const toggle = screen.getByRole('switch', { name: 'Draft mode' })
    expect(toggle.getAttribute('aria-checked')).toBe('true')

    await user.click(toggle)
    expect(onChange).toHaveBeenCalledWith(false)
  })
})

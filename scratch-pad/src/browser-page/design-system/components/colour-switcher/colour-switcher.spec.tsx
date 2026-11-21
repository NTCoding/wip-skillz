import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ColourSwitcher } from './colour-switcher'

describe('ColourSwitcher', () => {
  it('presses the button of the current mode when it is rendered', () => {
    render(<ColourSwitcher mode="dark" onChange={() => undefined} />)
    expect(screen.getByRole('button', { name: 'Dark', pressed: true }).textContent).toBe('Dark')
    expect(screen.getByRole('button', { name: 'Light', pressed: false }).textContent).toBe('Light')
  })

  it('asks for the light mode when Nick presses Light', async () => {
    const onChange = vi.fn<(mode: string) => void>()
    render(<ColourSwitcher mode="dark" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Light' }))
    expect(onChange).toHaveBeenCalledWith('light')
  })
})

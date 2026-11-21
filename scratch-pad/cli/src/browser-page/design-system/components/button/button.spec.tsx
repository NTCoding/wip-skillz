import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './button'

describe('Button', () => {
  it('calls onClick when Nick presses the button', async () => {
    const onClick = vi.fn<() => void>()
    render(<Button onClick={onClick}>Retry the export</Button>)
    await userEvent.click(screen.getByRole('button', { name: 'Retry the export' }))
    expect(onClick).toHaveBeenCalledWith()
  })

  it('draws the quiet look when no variant is given', () => {
    render(<Button onClick={() => undefined}>Retry the export</Button>)
    expect(screen.getByRole('button').className).toBe('button button--quiet')
  })

  it('ignores a press when the button is disabled', async () => {
    const onClick = vi.fn<() => void>()
    render(
      <Button onClick={onClick} variant="primary" disabled>
        Send the invoice
      </Button>,
    )
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })
})

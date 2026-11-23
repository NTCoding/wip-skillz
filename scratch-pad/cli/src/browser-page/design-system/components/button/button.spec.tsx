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

  it('draws a small button for an item of a list', () => {
    render(
      <Button onClick={() => undefined} size="small">
        Mark as done
      </Button>,
    )
    expect(screen.getByRole('button').className).toBe('button button--quiet button--small')
  })

  it('ignores a press while its request is pending but keeps the focus', async () => {
    const onClick = vi.fn<() => void>()
    render(
      <Button onClick={onClick} pending>
        Mark as done
      </Button>,
    )
    await userEvent.click(screen.getByRole('button'))
    const button = screen.getByRole('button')
    expect([
      onClick.mock.calls.length,
      button.getAttribute('aria-disabled'),
      button.hasAttribute('disabled'),
      document.activeElement,
    ]).toStrictEqual([0, 'true', false, button])
  })

  it('has the label as its name and is described by the text of describedBy', () => {
    render(
      <>
        <Button
          onClick={() => undefined}
          label="Mark as done: 4.2 Run the first export"
          describedBy="problem"
        >
          Mark as done
        </Button>
        <p id="problem">The server has stopped.</p>
      </>,
    )
    expect(
      screen.getByRole('button', {
        name: 'Mark as done: 4.2 Run the first export',
        description: 'The server has stopped.',
      }),
    ).not.toBeNull()
  })

  it('is an item of a menu with the tab index that the menu gives it', () => {
    const items: (HTMLButtonElement | null)[] = []
    render(
      <div role="menu">
        <Button
          onClick={() => undefined}
          menuItem={{ ref: (item) => void items.push(item), tabIndex: -1 }}
        >
          Mark as done
        </Button>
      </div>,
    )
    const item = screen.getByRole('menuitem', { name: 'Mark as done' })
    expect([item.tabIndex, items[0]]).toStrictEqual([-1, item])
  })
})

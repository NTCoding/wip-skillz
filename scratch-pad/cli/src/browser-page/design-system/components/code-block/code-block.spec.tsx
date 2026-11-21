import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CodeBlock } from './code-block'

const code = 'export const retryLimit = 5\nexportShop(42)\n'

afterEach(() => {
  vi.useRealTimers()
})

describe('CodeBlock', () => {
  it('shows the language in the bar and one line per line of code when a language is given', () => {
    const { container } = render(<CodeBlock code={code} language="ts" />)
    expect(screen.getByRole('figure').querySelector('figcaption')?.textContent).toContain('ts')
    expect(container.querySelectorAll('.code-block__line')).toHaveLength(2)
    expect(container.querySelector('.syntax-keyword')?.textContent).toBe('export')
  })

  it('shows "code" in the bar when the code block doesn’t have a language', () => {
    render(<CodeBlock code="retry limit: 5" language={undefined} />)
    expect(screen.getByText('code').className).toBe('code-block__language')
  })

  it('copies the code and says so when Nick presses Copy', async () => {
    const user = userEvent.setup()
    render(<CodeBlock code={code} language="ts" />)
    await user.click(screen.getByRole('button', { name: 'Copy' }))
    await expect(navigator.clipboard.readText()).resolves.toBe(code)
    expect(screen.getByRole('button', { name: 'Copied' }).textContent).toBe('Copied')
  })

  it('says that the copy failed when the clipboard refuses the code', async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new DOMException('denied'))
    render(<CodeBlock code={code} language="ts" />)
    await user.click(screen.getByRole('button', { name: 'Copy' }))
    expect(screen.getByRole('button', { name: "Couldn't copy" }).textContent).toBe("Couldn't copy")
  })

  it('shows Copy again 2 seconds after the code was copied', async () => {
    userEvent.setup()
    vi.useFakeTimers()
    render(<CodeBlock code={code} language="ts" />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
      await Promise.resolve()
    })
    expect(screen.getByRole('button', { name: 'Copied' }).textContent).toBe('Copied')
    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
    })
    expect(screen.getByRole('button', { name: 'Copy' }).textContent).toBe('Copy')
  })

  it('opens the code at full size and closes it with Escape when Nick presses the control', async () => {
    render(<CodeBlock code={code} language="ts" />)
    await userEvent.click(
      screen.getByRole('button', { name: 'Open the ts code block at full size' }),
    )
    expect(screen.getByRole('dialog', { name: 'ts code block' }).textContent).toContain(
      'retryLimit',
    )
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows the code once and gives the focus back to the control when Nick closes the full size view', async () => {
    const { container } = render(<CodeBlock code={code} language="ts" />)
    const control = screen.getByRole('button', { name: 'Open the ts code block at full size' })
    await userEvent.click(control)
    expect(container.querySelectorAll('figure.code-block--full-size')).toHaveLength(1)
    await userEvent.keyboard('{Escape}')
    expect(document.activeElement).toBe(control)
  })

  it('names the dialog "code block" when the code block doesn’t have a language', async () => {
    render(<CodeBlock code="retry limit: 5" language={undefined} />)
    await userEvent.click(screen.getByRole('button', { name: 'Open the code block at full size' }))
    expect(screen.getByRole('dialog', { name: 'code block' }).textContent).toContain('retry limit')
  })
})

import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FullSizeView } from './full-size-view'

function renderView() {
  return render(
    <main>
      <nav>
        <a href="#pages">Pages</a>
      </nav>
      <FullSizeView label="diagram">
        <p>The export job has 3 steps.</p>
      </FullSizeView>
    </main>,
  )
}

async function openView() {
  await userEvent.click(screen.getByRole('button', { name: 'Open the diagram at full size' }))
  return screen.getByRole('dialog', { name: 'diagram' })
}

describe('FullSizeView', () => {
  it('shows the block once without a dialog when Nick hasn’t opened it', () => {
    renderView()
    expect(screen.getAllByText('The export job has 3 steps.')).toHaveLength(1)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows the same block in a modal dialog with the focus on the close button when Nick presses the control', async () => {
    renderView()
    const block = screen.getByText('The export job has 3 steps.')
    const dialog = await openView()
    expect(dialog.contains(block)).toBe(true)
    expect(dialog.getAttribute('data-popover-shown')).toBe('true')
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Close the full size view' }),
    )
  })

  it('makes the page behind the dialog inert when the dialog is open', async () => {
    const { container } = renderView()
    await openView()
    expect(container.querySelector('nav')?.hasAttribute('inert')).toBe(true)
    expect(document.documentElement.dataset['fullSize']).toBe('open')
  })

  it('closes the dialog and gives the page back when Nick presses Escape', async () => {
    const { container } = renderView()
    await openView()
    await userEvent.keyboard('x{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(container.querySelector('nav')?.hasAttribute('inert')).toBe(false)
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Open the diagram at full size' }),
    )
  })

  it('prevents the default of the Escape that closes the dialog so that the card around the view stays open', async () => {
    renderView()
    await openView()
    const notPrevented = fireEvent.keyDown(document, { key: 'Escape' })
    expect([notPrevented, screen.queryByRole('dialog')]).toStrictEqual([false, null])
  })

  it('doesn’t pass the Escape that closes the dialog on to the field in the view or to the listeners on the document', async () => {
    const onFieldKey = vi.fn<() => void>()
    const onDocumentKey = vi.fn<() => void>()
    render(
      <FullSizeView label="comment">
        <textarea aria-label="Write a reply…" onKeyDown={onFieldKey} />
      </FullSizeView>,
    )
    document.addEventListener('keydown', onDocumentKey)
    await userEvent.click(screen.getByRole('button', { name: 'Open the comment at full size' }))
    await userEvent.click(screen.getByRole('textbox', { name: 'Write a reply…' }))
    await userEvent.keyboard('{Escape}')
    document.removeEventListener('keydown', onDocumentKey)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect([onFieldKey.mock.calls.length, onDocumentKey.mock.calls.length]).toStrictEqual([0, 0])
  })

  it('closes the dialog when Nick presses the close button', async () => {
    renderView()
    await openView()
    await userEvent.click(screen.getByRole('button', { name: 'Close the full size view' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.documentElement.dataset['fullSize']).toBeUndefined()
  })
})

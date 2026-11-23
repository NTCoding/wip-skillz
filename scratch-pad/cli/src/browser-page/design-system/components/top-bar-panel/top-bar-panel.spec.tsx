import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MarginLane } from '../margin-lane/margin-lane'
import { TopBarPanel, type TopBarPanelControls } from './top-bar-panel'

function Exports({ controls }: { readonly controls: TopBarPanelControls }) {
  return (
    <>
      <p>The export of the paid invoices is running.</p>
      <button type="button" onClick={controls.close}>
        Close
      </button>
      <button type="button" onClick={controls.closeAndFocusButton}>
        Back to the button
      </button>
      <ul id={controls.popupId} role="menu" aria-label="Running exports">
        <li role="menuitem">Paid invoices</li>
      </ul>
    </>
  )
}

function renderPanel(count = 2, popup: 'menu' | 'none' = 'menu') {
  render(
    <>
      <TopBarPanel
        icon="inbox"
        label="Exports"
        countText={`${count} exports are running`}
        count={count}
        tone="outbox"
        popup={popup === 'none' ? undefined : popup}
      >
        {(controls) => <Exports controls={controls} />}
      </TopBarPanel>
      <button type="button">Elsewhere</button>
    </>,
  )
  return screen.getByRole('button', { name: /^Exports/ })
}

function panel(): HTMLElement | null {
  return screen.queryByRole('group', { name: 'Exports' })
}

describe('TopBarPanel', () => {
  it('shows the label and the count on the button and describes the count to a screen reader', () => {
    const button = renderPanel()
    expect(button.textContent).toBe('Exports2')
    expect(button.getAttribute('aria-label')).toBe('Exports: 2 exports are running')
    expect(button.getAttribute('aria-haspopup')).toBe('menu')
    expect(button.querySelector('[data-tone="outbox"]')?.textContent).toBe('2')
  })

  it('doesn’t show a count when the count is 0', () => {
    const button = renderPanel(0)
    expect(button.textContent).toBe('Exports')
    expect(button.querySelector('.top-bar-panel__dot')).toBeNull()
  })

  it('shows a dot without a number when the count is 0 and the panel asks for a dot', () => {
    render(
      <TopBarPanel
        icon="inbox"
        label="Exports"
        countText="a file has been written"
        count={0}
        dot={true}
        tone="inbox"
      >
        {() => <p>The export of the paid invoices has written a file.</p>}
      </TopBarPanel>,
    )
    const button = screen.getByRole('button', { name: 'Exports: a file has been written' })
    expect(button.textContent).toBe('Exports')
    expect(button.querySelector('.top-bar-panel__dot')).not.toBeNull()
  })

  it('shows the count rather than the dot when the count isn’t 0', () => {
    render(
      <TopBarPanel
        icon="inbox"
        label="Exports"
        countText="2 exports are running"
        count={2}
        dot={true}
        tone="inbox"
      >
        {() => <p>The export of the paid invoices is running.</p>}
      </TopBarPanel>,
    )
    const button = screen.getByRole('button', { name: 'Exports: 2 exports are running' })
    expect(button.textContent).toBe('Exports2')
    expect(button.querySelector('.top-bar-panel__dot')).toBeNull()
  })

  it('opens the panel and points the button at the popup when Nick clicks the button', async () => {
    const button = renderPanel()
    await userEvent.click(button)
    expect(panel()?.textContent).toContain('The export of the paid invoices is running.')
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(button.getAttribute('aria-controls')).toBe(screen.getByRole('menu').id)
  })

  it('points the button at the panel when the panel doesn’t have a popup', async () => {
    const button = renderPanel(2, 'none')
    await userEvent.click(button)
    expect(button.getAttribute('aria-haspopup')).toBeNull()
    expect(button.getAttribute('aria-controls')).toBe(panel()?.id)
  })

  it('closes the panel when Nick clicks the button again', async () => {
    const button = renderPanel()
    await userEvent.click(button)
    await userEvent.click(button)
    expect(panel()).toBeNull()
    expect(button.getAttribute('aria-controls')).toBeNull()
  })

  it('closes the panel and focuses the button when Nick presses Escape', async () => {
    const button = renderPanel()
    await userEvent.click(button)
    screen.getByRole('button', { name: 'Close' }).focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(panel()).not.toBeNull()
    await userEvent.keyboard('{Escape}')
    expect(panel()).toBeNull()
    expect(document.activeElement).toBe(button)
  })

  it('only closes the panel, rather than the open card in the margin too, when Nick presses Escape', async () => {
    const onClosePopup = vi.fn<() => void>()
    render(
      <MarginLane
        label="Comments and notes"
        items={[
          {
            key: 'c-1',
            anchorLines: '3-3',
            content: <p>Is 5 retries enough?</p>,
            marker: undefined,
            popup: true,
          },
        ]}
        onClosePopup={onClosePopup}
      />,
    )
    renderPanel().focus()
    await userEvent.keyboard('{Enter}')
    expect(panel()).not.toBeNull()
    await userEvent.keyboard('{Escape}')
    expect(panel()).toBeNull()
    expect(onClosePopup).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    expect(onClosePopup).toHaveBeenCalledTimes(1)
  })

  it('closes the panel from its content and leaves the focus where it is when the content calls close', async () => {
    await userEvent.click(renderPanel())
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(panel()).toBeNull()
  })

  it('closes the panel and focuses the button when the content calls closeAndFocusButton', async () => {
    const button = renderPanel()
    await userEvent.click(button)
    await userEvent.click(screen.getByRole('button', { name: 'Back to the button' }))
    expect(panel()).toBeNull()
    expect(document.activeElement).toBe(button)
  })

  it('closes the panel when the focus leaves the button and the panel', async () => {
    await userEvent.click(renderPanel())
    await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }))
    expect(panel()).toBeNull()
  })
})

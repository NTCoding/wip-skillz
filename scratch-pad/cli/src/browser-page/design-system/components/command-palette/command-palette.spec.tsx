import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CommandPalette, type CommandPaletteResult } from './command-palette'

const results: CommandPaletteResult[] = [
  {
    key: 'retry-limit 1',
    place: 'Retry limit › Retry limit',
    snippet: 'Each retry waits twice as long as the retry before it.',
    matches: [
      { start: 5, end: 10 },
      { start: 38, end: 43 },
    ],
  },
  {
    key: 'first-retry 1',
    place: 'First retry › Why 30 seconds',
    snippet: '…the first retry waits 30 seconds.',
    matches: [{ start: 11, end: 16 }],
  },
]

function renderPalette(selected = 0, shown: readonly CommandPaletteResult[] = results) {
  const actions = {
    onQueryChange: vi.fn<(query: string) => void>(),
    onSelect: vi.fn<(index: number) => void>(),
    onChoose: vi.fn<(result: CommandPaletteResult) => void>(),
    onClose: vi.fn<() => void>(),
  }
  const rendered = render(
    <CommandPalette
      label="Search the pages"
      open
      query="retry"
      results={shown}
      selected={selected}
      {...actions}
    />,
  )
  return {
    ...rendered,
    ...actions,
    field: screen.getByRole('combobox', { name: 'Search the pages' }),
  }
}

describe('CommandPalette', () => {
  it('shows the place and the snippet of each result with the matches highlighted when the palette is open', () => {
    renderPalette()
    const options = screen.getAllByRole('option')
    expect(options.map((option) => option.textContent)).toStrictEqual([
      'Retry limit › Retry limitEach retry waits twice as long as the retry before it.↵',
      'First retry › Why 30 seconds…the first retry waits 30 seconds.↵',
    ])
    expect(
      [...(options[0]?.querySelectorAll('mark') ?? [])].map((mark) => mark.textContent),
    ).toStrictEqual(['retry', 'retry'])
    expect(screen.getByRole('dialog', { name: 'Search the pages' }).hasAttribute('open')).toBe(true)
  })

  it('shows the problem of the last search under the field when there is one', () => {
    render(
      <CommandPalette
        label="Search the pages"
        open
        query="retry"
        results={[]}
        selected={0}
        problem="The server didn’t respond."
        onQueryChange={() => undefined}
        onSelect={() => undefined}
        onChoose={() => undefined}
        onClose={() => undefined}
      />,
    )
    expect(screen.getByRole('alert').textContent).toBe('The server didn’t respond.')
  })

  it('shows the query of a search without any results in a message under the field', () => {
    render(
      <CommandPalette
        label="Search the pages"
        open
        query="  refund "
        results={[]}
        selected={0}
        queryWithoutResults="refund"
        onQueryChange={() => undefined}
        onSelect={() => undefined}
        onChoose={() => undefined}
        onClose={() => undefined}
      />,
    )
    expect(screen.getByRole('status').textContent).toBe('No results for “refund”')
  })

  it('closes when Nick clicks the dimmed page around the palette', () => {
    const { onClose } = renderPalette()
    const dialog = screen.getByRole('dialog')
    fireEvent.mouseDown(dialog)
    fireEvent.click(dialog)
    expect(onClose).toHaveBeenCalledWith()
  })

  it('stays open when Nick clicks in the palette or ends a selection of the field on the dimmed page', () => {
    const { onClose, field } = renderPalette()
    fireEvent.mouseDown(field)
    fireEvent.click(field)
    fireEvent.mouseDown(field)
    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('focuses the field and points it at the selected result when the palette opens', () => {
    const { field } = renderPalette(1)
    expect(document.activeElement).toBe(field)
    expect(field.getAttribute('aria-activedescendant')).toBe(screen.getAllByRole('option')[1]?.id)
    expect(screen.getAllByRole('option')[1]?.getAttribute('data-scrolled-into-view')).toBe('true')
  })

  it('moves the selection down and up but not past the first and the last result when Nick presses the arrows', async () => {
    const down = renderPalette(1)
    await userEvent.keyboard('{ArrowDown}')
    down.unmount()
    const up = renderPalette(0)
    await userEvent.keyboard('{ArrowUp}{ArrowDown}')
    expect(down.onSelect.mock.calls).toStrictEqual([[1]])
    expect(up.onSelect.mock.calls).toStrictEqual([[0], [1]])
  })

  it('chooses the selected result when Nick presses Enter and the result he clicks when he clicks one', async () => {
    const { onChoose } = renderPalette(1)
    await userEvent.keyboard('{Enter}')
    await userEvent.click(screen.getByText('Retry limit › Retry limit'))
    expect(onChoose.mock.calls).toStrictEqual([[results[1]], [results[0]]])
  })

  it('chooses a result when Nick presses Enter on the result itself', () => {
    const { onChoose } = renderPalette()
    fireEvent.keyDown(screen.getAllByRole('option')[1] ?? document.body, { key: 'Enter' })
    fireEvent.keyDown(screen.getAllByRole('option')[1] ?? document.body, { key: 'a' })
    expect(onChoose.mock.calls).toStrictEqual([[results[1]]])
  })

  it('closes without passing the Escape to the page when Nick presses Escape', async () => {
    const pageListener = vi.fn<(event: KeyboardEvent) => void>()
    document.addEventListener('keydown', pageListener)
    const { onClose } = renderPalette()
    await userEvent.keyboard('{Escape}')
    document.removeEventListener('keydown', pageListener)
    expect(onClose).toHaveBeenCalledWith()
    expect(pageListener).not.toHaveBeenCalled()
  })

  it('closes when the browser closes the dialog itself', () => {
    const { onClose } = renderPalette()
    fireEvent(screen.getByRole('dialog'), new Event('close'))
    expect(onClose).toHaveBeenCalledWith()
  })

  it('passes each change of the field to the feature when Nick types', async () => {
    const { onQueryChange } = renderPalette()
    await userEvent.type(screen.getByRole('combobox'), 's')
    expect(onQueryChange).toHaveBeenCalledWith('retrys')
  })

  it('doesn’t move or choose anything when there aren’t any results', async () => {
    const { onSelect, onChoose, field } = renderPalette(0, [])
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(onSelect).not.toHaveBeenCalled()
    expect(onChoose).not.toHaveBeenCalled()
    expect(field.getAttribute('aria-expanded')).toBe('false')
  })

  it('gives the focus back to the element that opened the palette when the palette closes', () => {
    render(<button type="button">Search</button>)
    const opener = screen.getByRole('button', { name: 'Search' })
    opener.focus()
    const { rerender } = render(
      <CommandPalette
        label="Search the pages"
        open
        query=""
        results={[]}
        selected={0}
        onQueryChange={() => undefined}
        onSelect={() => undefined}
        onChoose={() => undefined}
        onClose={() => undefined}
      />,
    )
    rerender(
      <CommandPalette
        label="Search the pages"
        open={false}
        query=""
        results={[]}
        selected={0}
        onQueryChange={() => undefined}
        onSelect={() => undefined}
        onChoose={() => undefined}
        onClose={() => undefined}
      />,
    )
    expect(document.activeElement).toBe(opener)
    expect(within(document.body).queryByRole('dialog')).toBeNull()
  })
})

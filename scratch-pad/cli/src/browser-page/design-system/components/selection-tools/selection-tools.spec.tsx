import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { type ThreadKindName } from '../thread-kind/thread-kind'
import { SelectionTools } from './selection-tools'

function renderTools(
  onPick: (kind: ThreadKindName) => void = () => undefined,
  onLeave: () => void = () => undefined,
) {
  render(<SelectionTools top={300} centre={200} onPick={onPick} onLeave={onLeave} />)
  return screen.getByRole('toolbar', { name: 'Write about the selected text' })
}

describe('SelectionTools', () => {
  it('offers the 3 kinds of thread above the selection when the tools are shown', () => {
    const tools = renderTools()
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toStrictEqual([
      'Comment',
      'Grammar / tone',
      'Improvement',
    ])
    expect(tools.style.getPropertyValue('--selection-tools-top')).toBe('292px')
    expect(tools.style.getPropertyValue('--selection-tools-left')).toBe('200px')
  })

  it('calls onPick with the kind when Nick presses a button', async () => {
    const onPick = vi.fn<(kind: ThreadKindName) => void>()
    renderTools(onPick)
    await userEvent.click(screen.getByRole('button', { name: 'Grammar / tone' }))
    expect(onPick).toHaveBeenCalledWith('grammar')
  })

  it('moves the focus to the first tool when Nick presses Tab for the first time after a selection', async () => {
    render(<button type="button">Before the tools</button>)
    renderTools()
    screen.getByRole('button', { name: 'Before the tools' }).focus()
    await userEvent.tab()
    expect(document.activeElement?.textContent).toBe('Comment')
    await userEvent.tab()
    expect(document.activeElement?.textContent).not.toBe('Comment')
  })

  it('moves the focus between the buttons when Nick presses the arrow keys', async () => {
    renderTools()
    await userEvent.tab()
    expect(document.activeElement?.textContent).toBe('Comment')
    await userEvent.keyboard('{ArrowLeft}')
    expect(document.activeElement?.textContent).toBe('Improvement')
    await userEvent.keyboard('{ArrowRight}{ArrowRight}x')
    expect(document.activeElement?.textContent).toBe('Grammar / tone')
  })

  it('calls onLeave when the focus moves from the tools to another part of the page', async () => {
    const onLeave = vi.fn<() => void>()
    renderTools(undefined, onLeave)
    render(<button type="button">After the tools</button>)
    await userEvent.tab()
    await userEvent.keyboard('{ArrowRight}')
    expect(onLeave).not.toHaveBeenCalled()
    screen.getByRole('button', { name: 'After the tools' }).focus()
    expect(onLeave).toHaveBeenCalledOnce()
  })
})

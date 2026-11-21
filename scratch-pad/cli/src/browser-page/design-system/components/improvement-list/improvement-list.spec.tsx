import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ImprovementList, type ImprovementActions, type ImprovementRow } from './improvement-list'

class RefusedDeleteError extends Error {}

const exportJobBug: Extract<ImprovementRow, { from: 'agent' }> = {
  from: 'agent',
  id: 'improvement-1',
  number: 1,
  time: '2026-11-20T09:30:00.000Z',
  title: 'The export job skips the custom files.',
  markdown: 'Run the export job twice.',
  details: <p>Run the export job twice.</p>,
  open: false,
}

const entries: ImprovementRow[] = [
  exportJobBug,
  {
    from: 'grammar',
    id: 'g-1',
    href: '/invoice-export/#g-1',
    time: '2026-11-20T10:05:00.000Z',
    text: 'Write "waits for" here.',
    outcome: undefined,
  },
  {
    from: 'agent',
    id: 'improvement-2',
    number: 2,
    time: '2026-11-20T11:00:00.000Z',
    title: 'The inbox prints the invoice note twice.',
    markdown: undefined,
    details: undefined,
    open: false,
  },
]

describe('ImprovementList', () => {
  it('shows the number, the time, the source and the text of each entry when it is rendered', () => {
    render(<ImprovementList label="Improvements" entries={entries} onNavigate={vi.fn()} />)
    const shown = screen.getAllByRole('listitem').map((entry) => entry.textContent)
    expect(shown).toStrictEqual([
      '120 Nov 2026, 09:30From the agentThe export job skips the custom files.DetailsRun the export job twice.',
      '20 Nov 2026, 10:05Grammar / toneg-1Write "waits for" here.',
      '220 Nov 2026, 11:00From the agentThe inbox prints the invoice note twice.',
    ])
  })

  it('gives each improvement of the agent its id as the anchor', () => {
    render(<ImprovementList label="Improvements" entries={entries} onNavigate={vi.fn()} />)
    expect(screen.getAllByRole('listitem').map((entry) => entry.id)).toStrictEqual([
      'improvement-1',
      '',
      'improvement-2',
    ])
  })

  it('collapses the details unless the entry is open', () => {
    const { container } = render(
      <ImprovementList
        label="Improvements"
        entries={[exportJobBug, { ...exportJobBug, id: 'improvement-3', open: true }]}
        onNavigate={vi.fn()}
      />,
    )
    expect([...container.querySelectorAll('details')].map((details) => details.open)).toStrictEqual(
      [false, true],
    )
  })

  it('shows the Done tag and the outcome of a note when the agent has closed the note with done', () => {
    render(
      <ImprovementList
        label="Improvements"
        entries={[
          {
            from: 'improvement',
            id: 'i-1',
            href: '/invoice-export/#i-1',
            time: '2026-11-20T10:20:00.000Z',
            text: 'Show the retry limit on the index page.',
            outcome: 'Added the retry limit of 5 attempts to the index page.',
          },
        ]}
        onNavigate={vi.fn()}
      />,
    )
    expect(screen.getByRole('listitem').textContent).toBe(
      '20 Nov 2026, 10:20Improvementi-1DoneShow the retry limit on the index page.Added the retry limit of 5 attempts to the index page.',
    )
  })

  it('navigates to the thread of a note when Nick clicks its id', async () => {
    const onNavigate = vi.fn()
    render(<ImprovementList label="Improvements" entries={entries} onNavigate={onNavigate} />)
    await userEvent.click(screen.getByRole('link', { name: 'g-1' }))
    expect(onNavigate).toHaveBeenCalledWith('/invoice-export/#g-1')
  })
})

function fakeActions(): ImprovementActions {
  return { edit: vi.fn(() => Promise.resolve()), delete: vi.fn(() => Promise.resolve()) }
}

function renderWithActions(actions: ImprovementActions) {
  render(
    <ImprovementList
      label="Improvements"
      entries={entries}
      onNavigate={vi.fn()}
      actions={actions}
    />,
  )
}

describe('ImprovementList with the edit and delete buttons', () => {
  it('shows the buttons only on the improvements of the agent when Nick can change them', () => {
    renderWithActions(fakeActions())
    expect(
      screen.getAllByRole('button').map((button) => button.getAttribute('aria-label')),
    ).toStrictEqual([
      'Edit improvement 1',
      'Delete improvement 1',
      'Edit improvement 2',
      'Delete improvement 2',
    ])
  })

  it('doesn’t show any buttons when Nick can’t change the improvements', () => {
    render(<ImprovementList label="Improvements" entries={entries} onNavigate={vi.fn()} />)
    expect(screen.queryAllByRole('button')).toStrictEqual([])
  })

  it('opens the title and the Markdown details in the form when Nick clicks the edit button', async () => {
    renderWithActions(fakeActions())
    await userEvent.click(screen.getByRole('button', { name: 'Edit improvement 1' }))
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveProperty(
      'value',
      'The export job skips the custom files.',
    )
    expect(screen.getByRole('textbox', { name: 'Details in Markdown' })).toHaveProperty(
      'value',
      'Run the export job twice.',
    )
    expect(screen.queryByText('Details')).toBeNull()
  })

  it('opens an empty details field when the improvement doesn’t have any details', async () => {
    renderWithActions(fakeActions())
    await userEvent.click(screen.getByRole('button', { name: 'Edit improvement 2' }))
    expect(screen.getByRole('textbox', { name: 'Details in Markdown' })).toHaveProperty('value', '')
  })

  it('saves the edit with the number of the improvement and closes the form when Nick presses Save', async () => {
    const actions = fakeActions()
    renderWithActions(actions)
    await userEvent.click(screen.getByRole('button', { name: 'Edit improvement 1' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Title' }), ' Again.')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(actions.edit).toHaveBeenCalledWith(1, {
      title: 'The export job skips the custom files. Again.',
      details: 'Run the export job twice.',
    })
    expect(screen.queryByRole('group', { name: 'Edit the improvement' })).toBeNull()
  })

  it('closes the form without saving when Nick presses Cancel', async () => {
    const actions = fakeActions()
    renderWithActions(actions)
    await userEvent.click(screen.getByRole('button', { name: 'Edit improvement 1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(actions.edit).not.toHaveBeenCalled()
    expect(screen.getByText('The export job skips the custom files.')).toBeTruthy()
  })

  it('asks Nick to confirm before the improvement is deleted', async () => {
    const actions = fakeActions()
    renderWithActions(actions)
    await userEvent.click(screen.getByRole('button', { name: 'Delete improvement 1' }))
    expect(screen.getByRole('group', { name: 'Delete improvement 1' }).textContent).toBe(
      'Delete improvement 1? It can’t be restored.CancelDelete',
    )
    expect(actions.delete).not.toHaveBeenCalled()
  })

  it('deletes the improvement and disables the buttons when Nick confirms the delete', async () => {
    const actions = fakeActions()
    renderWithActions(actions)
    await userEvent.click(screen.getByRole('button', { name: 'Delete improvement 1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(actions.delete).toHaveBeenCalledWith(1)
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveProperty('disabled', true)
  })

  it('keeps the improvement when Nick cancels the delete', async () => {
    const actions = fakeActions()
    renderWithActions(actions)
    await userEvent.click(screen.getByRole('button', { name: 'Delete improvement 1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(actions.delete).not.toHaveBeenCalled()
    expect(screen.queryByRole('group', { name: 'Delete improvement 1' })).toBeNull()
  })

  it('shows the problem and lets Nick try again when the server refuses the delete', async () => {
    renderWithActions({
      ...fakeActions(),
      delete: () => Promise.reject(new RefusedDeleteError('There isn’t any improvement 1.')),
    })
    await userEvent.click(screen.getByRole('button', { name: 'Delete improvement 1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect((await screen.findByRole('alert')).textContent).toBe('There isn’t any improvement 1.')
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveProperty('disabled', false)
  })
})

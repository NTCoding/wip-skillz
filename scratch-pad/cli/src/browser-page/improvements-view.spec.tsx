import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  exportPad,
  exportPadAddresses,
  fakeConnection,
  fakeNarrowWindow,
  improvements,
  type FakeConnection,
} from './browser-page-fixtures'
import { ScratchPadApp } from './scratch-pad-app'

function renderApp(path: string, fake: FakeConnection = fakeConnection()) {
  window.history.replaceState(null, '', path)
  render(
    <ScratchPadApp
      pad={exportPad}
      addresses={exportPadAddresses}
      connection={fake.connection}
      writing={fake.connection}
      settings={window.localStorage}
      narrowWindow={fakeNarrowWindow()}
    />,
  )
  return { fake }
}

async function shownPage(name: string): Promise<HTMLElement> {
  return screen.findByRole('heading', { level: 1, name })
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

describe('ScratchPadApp on the improvements', () => {
  it('shows the improvements of the agent and the notes of Nick in the order of their time when Nick opens the improvements', async () => {
    renderApp(`/${exportPad}/`)
    await shownPage('Invoice export')
    await userEvent.click(screen.getByRole('link', { name: 'Improvements' }))
    await shownPage('Improvements')
    const list = screen.getByRole('list', { name: 'Improvements' })
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((entry) => entry.textContent),
    ).toStrictEqual([
      '20 Nov 2026, 21:10Grammar / toneg-1Write who shows it.',
      '120 Nov 2026, 21:30From the agentThe export command skips the custom files.DetailsStepsRun the export of the invoice template.',
    ])
    expect(screen.getByRole('link', { name: 'Improvements' }).getAttribute('aria-current')).toBe(
      'page',
    )
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' }).textContent).toBe(
      'Invoice export/Improvements',
    )
  })

  it('scrolls to the improvement and opens its details when the address has the anchor of the improvement', async () => {
    const scrolled = vi.spyOn(Element.prototype, 'scrollIntoView')
    renderApp(`/${exportPad}/improvements#improvement-1`)
    await shownPage('Improvements')
    const entry = document.getElementById('improvement-1')
    await waitFor(() => expect(scrolled.mock.contexts).toContain(entry))
    expect(entry?.querySelector('details')?.open).toBe(true)
  })

  it('opens the thread of a note on its page when Nick clicks the id of the note', async () => {
    renderApp(`/${exportPad}/improvements`)
    await shownPage('Improvements')
    await userEvent.click(screen.getByRole('link', { name: 'g-1' }))
    await shownPage('Invoice export')
    expect(window.location.hash).toBe('#g-1')
  })

  it('opens the page that the details of an improvement link to when Nick clicks the link', async () => {
    renderApp(`/${exportPad}/improvements`)
    await shownPage('Improvements')
    await userEvent.click(screen.getByRole('link', { name: 'the invoice template' }))
    await shownPage('Invoice template')
    expect(window.location.pathname).toBe(`/${exportPad}/invoice-template.md`)
  })

  it('leaves out the details of an improvement that the agent logged without details', async () => {
    const fake = fakeConnection()
    vi.spyOn(fake.connection, 'improvements').mockResolvedValue({
      improvements: [
        {
          number: 1,
          time: '2026-11-20T21:30:00.000Z',
          title: 'The export command skips the custom files.',
          details: undefined,
          html: undefined,
          links: [],
        },
      ],
      notes: [],
    })
    renderApp(`/${exportPad}/improvements`, fake)
    await shownPage('Improvements')
    expect(screen.queryByText('Details')).toBeNull()
  })

  it('shows the Done tag and the outcome of a note when the agent has closed the note', async () => {
    const fake = fakeConnection()
    vi.spyOn(fake.connection, 'improvements').mockResolvedValue({
      improvements: [],
      notes: [
        {
          id: 'i-1',
          type: 'improvement',
          page: 'pages/index.md',
          text: 'Show the retry limit on the index page.',
          time: '2026-11-20T21:10:00.000Z',
          outcome: 'Added the retry limit of 5 attempts to the index page.',
        },
      ],
    })
    renderApp(`/${exportPad}/improvements`, fake)
    await shownPage('Improvements')
    const list = screen.getByRole('list', { name: 'Improvements' })
    expect(within(list).getByRole('listitem').textContent).toBe(
      '20 Nov 2026, 21:10Improvementi-1DoneShow the retry limit on the index page.Added the retry limit of 5 attempts to the index page.',
    )
  })

  it('says that there aren’t any improvements when the list is empty', async () => {
    const fake = fakeConnection()
    vi.spyOn(fake.connection, 'improvements').mockResolvedValue({ improvements: [], notes: [] })
    renderApp(`/${exportPad}/improvements`, fake)
    await shownPage('Improvements')
    expect(screen.getByRole('status').textContent).toBe('There aren’t any improvements yet.')
  })

  it('shows loading while the improvements are read', () => {
    renderApp(`/${exportPad}/improvements`)
    expect(screen.getByRole('status').textContent).toBe('Loading…')
  })

  it('reads the improvements again when the agent logs an improvement', async () => {
    const { fake } = renderApp(`/${exportPad}/improvements`)
    await shownPage('Improvements')
    vi.spyOn(fake.connection, 'improvements').mockResolvedValue({
      ...improvements,
      notes: [],
    })
    act(() => fake.sendChange({ kind: 'improvements' }))
    await waitFor(() => expect(screen.queryByRole('link', { name: 'g-1' })).toBeNull())
  })

  it('reads the improvements again when a thread changes', async () => {
    const { fake } = renderApp(`/${exportPad}/improvements`)
    await shownPage('Improvements')
    vi.spyOn(fake.connection, 'improvements').mockResolvedValue({
      improvements: [],
      notes: improvements.notes,
    })
    act(() => fake.sendChange({ kind: 'thread', id: 'g-1' }))
    await waitFor(() =>
      expect(
        within(screen.getByRole('list', { name: 'Improvements' })).getAllByRole('listitem'),
      ).toHaveLength(1),
    )
  })

  it('saves the edit of an improvement and reads the improvements again when Nick saves the form', async () => {
    const { fake } = renderApp(`/${exportPad}/improvements`)
    await shownPage('Improvements')
    const edit = vi.spyOn(fake.connection, 'editImprovement')
    vi.spyOn(fake.connection, 'improvements').mockResolvedValue({
      ...improvements,
      improvements: improvements.improvements.map((improvement) => ({
        ...improvement,
        title: 'The export skips the invoice template.',
      })),
    })
    await userEvent.click(screen.getByRole('button', { name: 'Edit improvement 1' }))
    const title = screen.getByRole('textbox', { name: 'Title' })
    await userEvent.clear(title)
    await userEvent.type(title, 'The export skips the invoice template.')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(edit).toHaveBeenCalledWith(1, {
      title: 'The export skips the invoice template.',
      details: '## Steps\n\nRun the export of [the invoice template](invoice-template.md).',
    })
    expect(await screen.findByText('The export skips the invoice template.')).toBeTruthy()
  })

  it('deletes an improvement and reads the improvements again when Nick confirms the delete', async () => {
    const { fake } = renderApp(`/${exportPad}/improvements`)
    await shownPage('Improvements')
    const deleted = vi.spyOn(fake.connection, 'deleteImprovement')
    vi.spyOn(fake.connection, 'improvements').mockResolvedValue({
      ...improvements,
      improvements: [],
    })
    await userEvent.click(screen.getByRole('button', { name: 'Delete improvement 1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(deleted).toHaveBeenCalledWith(1)
    await waitFor(() => expect(document.getElementById('improvement-1')).toBeNull())
  })
})

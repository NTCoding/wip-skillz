import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  exportPad,
  exportPadAddresses,
  fakeConnection,
  fakeNarrowWindow,
  indexPage,
} from './browser-page-fixtures'
import { ScratchPadApp } from './scratch-pad-app'

function renderApp(path: string, fake = fakeConnection()) {
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
}

async function shownPage(name: string): Promise<HTMLElement> {
  return screen.findByRole('heading', { level: 1, name })
}

function sectionOf(id: string): HTMLDetailsElement | null {
  return document.getElementById(id)?.closest('details') ?? null
}

const taskRows = () =>
  [...document.querySelectorAll('.task-list__task')].map((row) => row.textContent)

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

describe('ScratchPadApp on the progress tracker', () => {
  it('shows the subtasks of the task in progress under their task', async () => {
    renderApp(`/${exportPad}/progress-tracker`)
    await shownPage('Progress tracker')

    expect(taskRows()).toStrictEqual([
      '1Design the export jobDone',
      '2Write the invoice templateIn progress',
      '2.1Show the tax numberDone',
      '2.2Show the bank detailsIn progress',
      '3Check the retry limitTo do',
    ])
  })

  it('shows a collapsed section below the list for each task that has a description or a subtask with one', async () => {
    renderApp(`/${exportPad}/progress-tracker`)
    await shownPage('Progress tracker')

    const headings = screen.getAllByRole('heading', { level: 2 })
    expect(headings.map((heading) => [heading.id, heading.textContent])).toStrictEqual([
      ['t-1', '1. Design the export job'],
      ['t-2', '2. Write the invoice template'],
      ['t-3', '3. Check the retry limit'],
    ])
    expect(screen.getByRole('heading', { level: 3, name: '2.1 Show the tax number' }).id).toBe(
      't-4',
    )
    expect(headings.map((heading) => heading.closest('details')?.open)).toStrictEqual([
      false,
      false,
      false,
    ])
  })

  it('links the title of a task with a section to its section but leaves the other titles as text', async () => {
    renderApp(`/${exportPad}/progress-tracker`)
    await shownPage('Progress tracker')

    const titles = [
      'Design the export job',
      'Write the invoice template',
      'Show the tax number',
      'Check the retry limit',
    ]
    expect(
      titles.map((name) => screen.getByRole('link', { name }).getAttribute('href')),
    ).toStrictEqual([
      `/${exportPad}/progress-tracker#t-1`,
      `/${exportPad}/progress-tracker#t-2`,
      `/${exportPad}/progress-tracker#t-4`,
      `/${exportPad}/progress-tracker#t-3`,
    ])
    expect(screen.getByText('Show the bank details').tagName).toBe('SPAN')
  })

  it('opens and scrolls to the section of the task when Nick clicks the title of the task', async () => {
    const scrolled = vi.spyOn(Element.prototype, 'scrollIntoView')
    renderApp(`/${exportPad}/progress-tracker`)
    await shownPage('Progress tracker')

    await userEvent.click(screen.getByRole('link', { name: 'Design the export job' }))

    expect(window.location.hash).toBe('#t-1')
    await waitFor(() => expect(scrolled.mock.contexts).toContain(document.getElementById('t-1')))
    expect(sectionOf('t-1')?.open).toBe(true)
  })

  it('opens the section of the task again when Nick has closed it and follows the same link again', async () => {
    renderApp(`/${exportPad}/progress-tracker`)
    await shownPage('Progress tracker')
    const link = screen.getByRole('link', { name: 'Design the export job' })

    await userEvent.click(link)
    await userEvent.click(
      screen.getByRole('heading', { level: 2, name: '1. Design the export job' }),
    )
    const closed = sectionOf('t-1')?.open
    await userEvent.click(link)

    expect([closed, sectionOf('t-1')?.open]).toStrictEqual([false, true])
  })

  it('opens the section of the subtask and of its task when the address has the id of the subtask', async () => {
    const scrolled = vi.spyOn(Element.prototype, 'scrollIntoView')
    renderApp(`/${exportPad}/progress-tracker#t-4`)
    await shownPage('Progress tracker')

    await waitFor(() => expect(scrolled.mock.contexts).toContain(document.getElementById('t-4')))
    expect([sectionOf('t-2')?.open, sectionOf('t-4')?.open]).toStrictEqual([true, true])
  })

  it('scrolls to the row of a subtask without a description when the address has its id', async () => {
    const scrolled = vi.spyOn(Element.prototype, 'scrollIntoView')
    renderApp(`/${exportPad}/progress-tracker#t-5`)
    await shownPage('Progress tracker')

    await waitFor(() => expect(scrolled.mock.contexts).toContain(document.getElementById('t-5')))
    expect(document.getElementById('t-5')?.textContent).toBe('2.2Show the bank detailsIn progress')
  })

  it('opens the page that the description of a task links to when Nick clicks the link', async () => {
    renderApp(`/${exportPad}/progress-tracker#t-1`)
    await shownPage('Progress tracker')

    await userEvent.click(screen.getByRole('link', { name: 'the first retry' }))

    await shownPage('First retry')
    expect(window.location.pathname).toBe(`/${exportPad}/first-retry.md`)
  })
})

describe('ScratchPadApp on a page that is part of a task', () => {
  const chips = () =>
    within(screen.getByRole('list', { name: 'Tasks' }))
      .getAllByRole('listitem')
      .map((chip) => chip.textContent)

  it('shows a chip for each task whose description links to the page or to a page above it', async () => {
    renderApp(`/${exportPad}/first-retry.md`)
    await shownPage('First retry')

    expect(chips()).toStrictEqual([
      'Part of task1 Design the export jobDone',
      'Part of task3 Check the retry limitTo do',
    ])
  })

  it('shows the chip of a subtask but not the chip of a task whose link points to a heading of the page', async () => {
    renderApp(`/${exportPad}/invoice-template.md`)
    await shownPage('Invoice template')

    expect(chips()).toStrictEqual(['Part of task2.1 Show the tax numberDone'])
  })

  it("doesn't show any chips on a page that isn't part of a task", async () => {
    renderApp(`/${exportPad}/`)
    await shownPage('Invoice export')

    expect(screen.queryByRole('list', { name: 'Tasks' })).toBeNull()
  })
})

describe('ScratchPadApp on a page with a task reference', () => {
  function withReferences() {
    const fake = fakeConnection()
    fake.pages.set('index.md', {
      ...indexPage,
      html: `${indexPage.html}<p data-lines="40-40">Next is <a href="task:t-4">task:t-4</a> and then <a href="task:t-9">task:t-9</a>.</p>\n`,
      links: [
        ...indexPage.links,
        { kind: 'task', href: 'task:t-4', id: 't-4' },
        { kind: 'task', href: 'task:t-9', id: 't-9' },
      ],
    })
    return fake
  }

  it('shows the number and the title of the task as a link to the task on the progress tracker', async () => {
    renderApp(`/${exportPad}/`, withReferences())
    await shownPage('Invoice export')

    expect(screen.getByRole('link', { name: '2.1 Show the tax number' }).getAttribute('href')).toBe(
      `/${exportPad}/progress-tracker#t-4`,
    )
  })

  it('shows a reference to a task that is not on the progress tracker as its text', async () => {
    renderApp(`/${exportPad}/`, withReferences())
    await shownPage('Invoice export')

    expect(screen.getByText('task:t-9').tagName).toBe('SPAN')
  })
})

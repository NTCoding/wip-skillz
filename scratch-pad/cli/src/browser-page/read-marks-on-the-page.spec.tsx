import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type PageReadMark } from './api-responses'
import {
  exportedPadJson,
  exportPad,
  exportPadAddresses,
  fakeConnection,
  fakeNarrowWindow,
  type FakeConnection,
} from './browser-page-fixtures'
import { exportedAddresses } from './browser-route'
import { exportedScratchPad } from './exported-scratch-pad'
import { ScratchPadApp } from './scratch-pad-app'

const changedTime = '2026-11-20T21:30:00.000Z'

class UnreachableServerError extends Error {}

// The hash of the section's text that the browser shows
const retryLimit = { id: 'retry-limit', hash: 'a1' }

type NewMark = Omit<PageReadMark, 'changedTime'>

function fakeWithMark(mark: NewMark): FakeConnection {
  const fake = fakeConnection()
  fake.readMarks.push({ ...mark, changedTime })
  return fake
}

async function renderIndex(fake: FakeConnection) {
  window.history.replaceState(null, '', `/${exportPad}/`)
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
  await screen.findByRole('region', { name: 'Comment c-1' })
}

function sidebar(): HTMLElement {
  return screen.getByRole('navigation', { name: 'Pages of the scratch pad' })
}

function breadcrumb(): HTMLElement {
  return screen.getByRole('navigation', { name: 'Breadcrumb' })
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

describe('a new page', () => {
  const newIndex: NewMark = {
    page: 'pages/index.md',
    state: 'new',
    sections: [retryLimit],
    changedSections: [],
  }

  it('has a New dot in the sidebar, a line under its title and Mark as read in the breadcrumb', async () => {
    await renderIndex(fakeWithMark(newIndex))

    expect(await screen.findByText('This page is new.')).not.toBeNull()
    expect(within(sidebar()).getByRole('img', { name: 'New' })).not.toBeNull()
    expect(screen.getByRole('heading', { level: 1 }).nextElementSibling?.textContent).toBe(
      'This page is new.Mark as read',
    )
    expect(within(breadcrumb()).getByRole('button', { name: 'Mark as read' })).not.toBeNull()
  })

  it('removes the line and the dot when Nick marks the page as read', async () => {
    const fake = fakeWithMark(newIndex)
    await renderIndex(fake)
    const line = (await screen.findByText('This page is new.')).closest('p') ?? document.body

    await userEvent.click(within(line).getByRole('button', { name: 'Mark as read' }))

    expect(fake.connection.markPageRead).toHaveBeenCalledWith('index.md', [retryLimit])
    await waitFor(() => expect(screen.queryByText('This page is new.')).toBeNull())
    expect(within(sidebar()).queryByRole('img', { name: 'New' })).toBeNull()
  })

  it('brings the line and the dot back when Nick marks a read page as unread', async () => {
    const fake = fakeWithMark({ ...newIndex, state: 'read' })
    await renderIndex(fake)

    await userEvent.click(within(breadcrumb()).getByRole('button', { name: 'Mark as unread' }))

    expect(fake.connection.markPageUnread).toHaveBeenCalledWith('index.md')
    expect(await screen.findByText('This page is new.')).not.toBeNull()
    expect(within(breadcrumb()).getByRole('button', { name: 'Mark as read' })).not.toBeNull()
  })

  it('marks the page as read when Nick clicks Mark as read in the breadcrumb', async () => {
    const fake = fakeWithMark(newIndex)
    await renderIndex(fake)
    await screen.findByText('This page is new.')

    await userEvent.click(within(breadcrumb()).getByRole('button', { name: 'Mark as read' }))

    expect(fake.connection.markPageRead).toHaveBeenCalledWith('index.md', [retryLimit])
    await waitFor(() => expect(screen.queryByText('This page is new.')).toBeNull())
  })

  it('shows the problem in the breadcrumb when the server doesn’t mark the page as read', async () => {
    const fake = fakeWithMark(newIndex)
    vi.mocked(fake.connection.markPageRead).mockRejectedValueOnce(
      new UnreachableServerError('The server didn’t respond.'),
    )
    await renderIndex(fake)
    await screen.findByText('This page is new.')

    await userEvent.click(within(breadcrumb()).getByRole('button', { name: 'Mark as read' }))

    expect((await within(breadcrumb()).findByRole('alert')).textContent).toBe(
      'The server didn’t respond.',
    )
    expect(screen.getByText('This page is new.')).not.toBeNull()
  })

  it('is listed in the Inbox under the updates to pages, below the items that need an answer', async () => {
    await renderIndex(fakeWithMark(newIndex))
    await screen.findByText('This page is new.')

    await userEvent.click(screen.getByRole('button', { name: /^Inbox/ }))
    await userEvent.click(screen.getByRole('button', { name: /^Updates to pages/ }))

    expect(
      screen.getAllByRole('menuitem').map((item) => item.textContent?.slice(0, 10)),
    ).toStrictEqual([
      'The agent ',
      'A decision',
      'The invoic',
      'The retry ',
      '2.2 Show t',
      'Mark as do',
      'A new page',
    ])
  })
})

describe('a changed section', () => {
  const changedIndex: NewMark = {
    page: 'pages/index.md',
    state: 'read',
    sections: [retryLimit],
    changedSections: [{ ...retryLimit, title: 'Retry limit' }],
  }

  it('has a card in the margin, a bar beside each of its blocks and a Changed dot in the sidebar', async () => {
    await renderIndex(fakeWithMark(changedIndex))
    const changed = await screen.findByRole('region', { name: 'Retry limit has changed' })

    expect(changed.textContent).toContain('This section has changed')
    expect(within(sidebar()).getByRole('img', { name: 'Changed' })).not.toBeNull()
    expect(
      [...document.querySelectorAll('[data-changed-section]')].map((block) => block.tagName),
    ).toStrictEqual(['H2', 'P', 'DIV', 'DIV', 'DIV'])
    expect(within(breadcrumb()).getByRole('button', { name: 'Mark as unread' })).not.toBeNull()
  })

  it('removes the card, the bars, the dot and the row in the Inbox when Nick clicks inside the section', async () => {
    const fake = fakeWithMark(changedIndex)
    await renderIndex(fake)
    await screen.findByRole('region', { name: 'Retry limit has changed' })

    await userEvent.click(screen.getByRole('heading', { level: 2, name: 'Retry limit' }))

    expect(fake.connection.markSectionRead).toHaveBeenCalledWith('index.md', {
      ...retryLimit,
      title: 'Retry limit',
    })
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Retry limit has changed' })).toBeNull(),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Inbox: 3 items wait for you' }))
    expect([
      document.querySelectorAll('[data-changed-section]').length,
      within(sidebar()).queryByRole('img', { name: 'Changed' }),
      screen.queryByRole('button', { name: /^Updates to pages/ }),
    ]).toStrictEqual([0, null, null])
  })

  it('counts one section less in the Inbox when Nick clicks inside one of 2 changed sections', async () => {
    const waitBetweenRetries = { id: 'wait-between-retries', hash: 'c3' }
    await renderIndex(
      fakeWithMark({
        ...changedIndex,
        sections: [retryLimit, waitBetweenRetries],
        changedSections: [
          { ...retryLimit, title: 'Retry limit' },
          { ...waitBetweenRetries, title: 'Wait between retries' },
        ],
      }),
    )
    await screen.findByRole('region', { name: 'Retry limit has changed' })
    const inbox = screen.getByRole('button', { name: /^Inbox/ })
    const changedPageRow = async (): Promise<string> => {
      await userEvent.click(inbox)
      await userEvent.click(screen.getByRole('button', { name: /^Updates to pages/ }))
      const updates = screen.getByRole('menu', { name: /^Updates to pages/ })
      const row = within(updates).getByRole('menuitem')
      await userEvent.keyboard('{Escape}')
      return String(row.textContent)
    }
    expect(await changedPageRow()).toBe('Updates to Invoice export20 Nov, 21:302 sections changed')

    await userEvent.click(screen.getByRole('heading', { level: 3, name: 'Wait between retries' }))

    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Wait between retries has changed' })).toBeNull(),
    )
    expect(screen.getByRole('region', { name: 'Retry limit has changed' })).not.toBeNull()
    expect(await changedPageRow()).toBe('Updates to Invoice export20 Nov, 21:301 section changed')
  })

  it('shows the problem in the card and keeps the section changed when the server can’t mark the section as read', async () => {
    const fake = fakeWithMark(changedIndex)
    vi.mocked(fake.connection.markSectionRead).mockRejectedValueOnce(
      new UnreachableServerError('There isn’t any section retry-limit on index.md.'),
    )
    await renderIndex(fake)
    const changed = await screen.findByRole('region', { name: 'Retry limit has changed' })

    await userEvent.click(screen.getByRole('heading', { level: 2, name: 'Retry limit' }))

    expect((await within(changed).findByRole('alert')).textContent).toBe(
      'There isn’t any section retry-limit on index.md.',
    )
    expect(document.querySelectorAll('[data-changed-section]')).not.toHaveLength(0)
    await userEvent.click(screen.getByRole('heading', { level: 2, name: 'Retry limit' }))
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Retry limit has changed' })).toBeNull(),
    )
    expect(fake.connection.markSectionRead).toHaveBeenCalledTimes(2)
  })

  it('opens the card of the section below its marker when the server can’t mark the section as read, so that a narrow reading column shows the problem too', async () => {
    const fake = fakeWithMark(changedIndex)
    vi.mocked(fake.connection.markSectionRead).mockRejectedValueOnce(
      new UnreachableServerError('There isn’t any section retry-limit on index.md.'),
    )
    await renderIndex(fake)
    const changed = await screen.findByRole('region', { name: 'Retry limit has changed' })
    const marker = screen.getByRole('button', { name: 'Retry limit has changed' })
    expect([
      changed.closest('[data-popup]')?.getAttribute('data-popup'),
      marker.getAttribute('aria-expanded'),
    ]).toStrictEqual(['false', 'false'])

    await userEvent.click(screen.getByRole('heading', { level: 2, name: 'Retry limit' }))

    await within(changed).findByRole('alert')
    expect([
      changed.closest('[data-popup]')?.getAttribute('data-popup'),
      marker.getAttribute('aria-expanded'),
    ]).toStrictEqual(['true', 'true'])
  })

  it('sends one request when Nick double clicks inside the section and another one after the first has failed', async () => {
    const fake = fakeWithMark(changedIndex)
    const answered = Promise.withResolvers<undefined>()
    vi.mocked(fake.connection.markSectionRead).mockReturnValueOnce(answered.promise)
    await renderIndex(fake)
    await screen.findByRole('region', { name: 'Retry limit has changed' })
    const heading = screen.getByRole('heading', { level: 2, name: 'Retry limit' })

    await userEvent.dblClick(heading)
    expect(fake.connection.markSectionRead).toHaveBeenCalledOnce()
    answered.reject(new UnreachableServerError('The server didn’t respond.'))
    await screen.findByRole('alert')
    await userEvent.click(heading)

    expect(fake.connection.markSectionRead).toHaveBeenCalledTimes(2)
  })

  it('still opens a comment on the text that Nick selects in the section, after the click at the end of the selection marks the section as read', async () => {
    const fake = fakeWithMark(changedIndex)
    const startThread = vi.spyOn(fake.connection, 'startThread')
    await renderIndex(fake)
    await screen.findByRole('region', { name: 'Retry limit has changed' })
    const block = document.querySelector('[data-lines="8-8"]') ?? document.body
    const range = document.createRange()
    range.setStart(block.firstChild ?? block, 0)
    range.setEnd(block.firstChild ?? block, 3)
    document.getSelection()?.removeAllRanges()
    document.getSelection()?.addRange(range)

    fireEvent.mouseUp(block)
    fireEvent.click(block)
    await waitFor(() => expect(document.querySelectorAll('[data-changed-section]')).toHaveLength(0))
    await userEvent.click(screen.getByRole('button', { name: 'Comment' }))
    await userEvent.keyboard('Is 5 enough?{Enter}')

    expect(fake.connection.markSectionRead).toHaveBeenCalledOnce()
    expect(startThread.mock.calls.at(-1)?.[0].selectedText).toBe('The')
  })

  it('shows the card of a changed section at the top of the margin when the page doesn’t have its heading', async () => {
    await renderIndex(
      fakeWithMark({
        ...changedIndex,
        changedSections: [{ id: 'the-logo', title: 'The logo', hash: 'b2' }],
      }),
    )

    expect(await screen.findByRole('region', { name: 'The logo has changed' })).not.toBeNull()
    expect(document.querySelectorAll('[data-changed-section]')).toHaveLength(0)
  })

  it('opens the card of the changed section at full size when Nick clicks its expand button', async () => {
    await renderIndex(fakeWithMark(changedIndex))
    const changed = await screen.findByRole('region', { name: 'Retry limit has changed' })

    await userEvent.click(
      within(changed).getByRole('button', { name: 'Open the change to Retry limit at full size' }),
    )

    const view = screen.getByRole('dialog', { name: 'Retry limit has changed' })
    expect(view.textContent).toContain('This section has changed')
    expect(within(view).queryByRole('button', { name: 'Mark as read' })).toBeNull()
  })

  it('opens and closes the card when Nick clicks its marker beside the text', async () => {
    await renderIndex(fakeWithMark(changedIndex))
    const marker = await screen.findByRole('button', { name: 'Retry limit has changed' })

    await userEvent.click(marker)
    expect(marker.getAttribute('aria-expanded')).toBe('true')
    await userEvent.click(marker)
    expect(marker.getAttribute('aria-expanded')).toBe('false')
  })
})

describe('the read marks in the export', () => {
  it('doesn’t show any marks or the Inbox / Outbox in the sidebar, and its address shows a note', async () => {
    window.history.replaceState(null, '', '/Users/jo/export.html#/inbox-outbox')
    render(
      <ScratchPadApp
        pad={exportPad}
        addresses={exportedAddresses(exportPad)}
        connection={exportedScratchPad(exportedPadJson)}
        writing={undefined}
        settings={window.localStorage}
        narrowWindow={fakeNarrowWindow()}
      />,
    )

    expect(
      await screen.findByText('The export doesn’t include the Inbox and the Outbox.'),
    ).not.toBeNull()
    expect(within(sidebar()).queryByRole('link', { name: 'Inbox / Outbox' })).toBeNull()
    expect(within(sidebar()).queryByRole('img')).toBeNull()
    expect(breadcrumb().textContent).toContain('Inbox / Outbox')
  })
})

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  decisionLog,
  exportedPadJson,
  exportPad,
  fakeNarrowWindow,
  improvements,
  invoiceTemplatePage,
  progressTracker,
} from './browser-page-fixtures'
import { exportedAddresses } from './browser-route'
import {
  BrokenExportError,
  exportedScratchPad,
  UnknownExportedPageError,
} from './exported-scratch-pad'
import { ScratchPadApp } from './scratch-pad-app'

const exportPath = '/Users/jo/invoice-export/export.html'

function renderExport(hash = '') {
  window.history.replaceState(null, '', `${exportPath}${hash}`)
  return render(
    <ScratchPadApp
      pad={exportPad}
      addresses={exportedAddresses(exportPad)}
      connection={exportedScratchPad(exportedPadJson)}
      writing={undefined}
      settings={window.localStorage}
      narrowWindow={fakeNarrowWindow()}
    />,
  )
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

describe('exportedScratchPad', () => {
  const exported = exportedScratchPad(exportedPadJson)

  it('returns the page, its threads, the progress tracker and the log of decisions from the data of the export', async () => {
    expect(await exported.page('invoice-template.md')).toStrictEqual(invoiceTemplatePage)
    expect((await exported.threads('index.md')).map((thread) => thread.id)).toStrictEqual([
      'c-1',
      'g-1',
    ])
    expect(await exported.progressTracker()).toStrictEqual(progressTracker)
    expect(await exported.decisionLog()).toStrictEqual(decisionLog)
  })

  it('returns the improvements from the data of the export', async () => {
    expect(await exported.improvements()).toStrictEqual(improvements)
  })

  it('returns an empty Inbox and doesn’t return any threads when the page doesn’t have any', async () => {
    expect(await exported.nickInbox()).toStrictEqual({ threads: [], decisions: [] })
    expect(await exported.threads('invoice-template.md')).toStrictEqual([])
  })

  it('returns a stream of changes that never changes when the export is open', () => {
    const listener = vi.fn<() => void>()
    exported.onChange({ changed: listener, connection: listener })()
    expect(listener).not.toHaveBeenCalled()
  })

  it('rejects with UnknownExportedPageError when the export doesn’t have the page', async () => {
    await expect(exported.page('queue.md')).rejects.toThrow(UnknownExportedPageError)
    await expect(exported.page('queue.md')).rejects.toThrow(
      'The export doesn’t have a page called queue.md.',
    )
  })

  it('throws BrokenExportError when the data of the export isn’t valid', () => {
    expect(() => exportedScratchPad('{"pages":')).toThrow(BrokenExportError)
    expect(() => exportedScratchPad('{"pages":[]}')).toThrow(
      'The data of the export is broken. Export the scratch pad again with scratch-pad export.',
    )
  })
})

describe('ScratchPadApp in an export', () => {
  it('shows the page with each thread beside its block without a reply box when the export is opened', async () => {
    renderExport()
    const card = await screen.findByRole('region', { name: 'Comment c-1' })
    expect(within(card).getByText('I have raised the limit to 8.').tagName).toBe('P')
    expect(within(card).queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('button', { name: /Resolve/u })).toBeNull()
  })

  it('doesn’t show the Inbox, the buttons of a decision or the comment button of an html block when the export is opened', async () => {
    renderExport()
    await screen.findByRole('heading', { level: 1, name: 'Invoice export' })
    expect(screen.queryByRole('button', { name: /Inbox/u })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Proposal' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Comment on the HTML block' })).toBeNull()
  })

  it('puts the frame of the html block in the page when the export is opened', async () => {
    renderExport()
    const frame = await screen.findByTitle('HTML block')
    expect(frame.getAttribute('src')).toBeNull()
    expect(frame.getAttribute('srcdoc')).toContain('html-block-frame-ready')
  })

  it('goes to another page and keeps the address in the hash when the reader clicks a page in the sidebar', async () => {
    renderExport()
    const sidebar = await screen.findByRole('navigation', { name: 'Pages of the scratch pad' })
    await userEvent.click(within(sidebar).getByRole('link', { name: 'Invoice template' }))
    await screen.findByRole('heading', { level: 1, name: 'Invoice template' })
    expect(`${window.location.pathname}${window.location.hash}`).toBe(
      `${exportPath}#/invoice-template.md`,
    )
  })

  it('shows the list of pages on the index page and goes to a page of the list in the hash', async () => {
    renderExport()
    const list = await screen.findByRole('list', { name: 'Pages' })
    expect(
      within(list)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toStrictEqual(['#/invoice-template.md', '#/retry-limit.md', '#/shop-storage.md'])
    await userEvent.click(within(list).getByText('Invoice template'))
    await screen.findByRole('heading', { level: 1, name: 'Invoice template' })
    expect(window.location.hash).toBe('#/invoice-template.md')
  })

  it('shows the parents of a sub page in the breadcrumb and the sidebar of the export', async () => {
    renderExport('#/first-retry.md')
    await screen.findByRole('heading', { level: 1, name: 'First retry' })
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    await waitFor(() =>
      expect(breadcrumb.textContent).toBe(
        'Invoice export/retry-limit.md/Wait between retries/First retry',
      ),
    )
    const sidebar = screen.getByRole('navigation', { name: 'Pages of the scratch pad' })
    expect(
      within(sidebar).getByRole('link', { name: 'Wait between retries' }).getAttribute('href'),
    ).toBe('#/wait-between-retries.md')
  })

  it('opens a page from the name of its file with the number in the hash of the export', async () => {
    renderExport('#/2.1.1-first-retry.md')
    await screen.findByRole('heading', { level: 1, name: 'First retry' })
    expect(window.location.hash).toBe('#/first-retry.md')
  })

  it('shows the progress tracker when the hash of the export names it', async () => {
    renderExport('#/progress-tracker')
    await screen.findByRole('heading', { level: 1, name: 'Progress tracker' })
    expect(screen.getByRole('link', { name: 'Decisions' }).getAttribute('href')).toBe('#/decisions')
    expect(screen.getByRole('link', { name: 'Improvements' }).getAttribute('href')).toBe(
      '#/improvements',
    )
  })

  it('doesn’t offer to comment on a selection when the export is opened', async () => {
    renderExport()
    await screen.findByRole('region', { name: 'Comment c-1' })
    const text = document.querySelector('[data-lines="3-4"]')?.firstChild ?? document.body
    const range = document.createRange()
    range.setStart(text, 4)
    range.setEnd(text, 14)
    document.getSelection()?.removeAllRanges()
    document.getSelection()?.addRange(range)
    fireEvent.mouseUp(document.body)
    expect(document.getSelection()?.toString()).toBe('export job')
    expect(screen.queryByRole('button', { name: 'Comment' })).toBeNull()
  })

  it('doesn’t show the edit and delete buttons of an improvement when the export is opened', async () => {
    renderExport('#/improvements')
    await screen.findByRole('heading', { level: 1, name: 'Improvements' })
    expect(screen.queryByRole('button', { name: 'Edit improvement 1' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Delete improvement 1' })).toBeNull()
  })
})

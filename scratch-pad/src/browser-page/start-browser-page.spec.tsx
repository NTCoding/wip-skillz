import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  exportedPadJson,
  exportPad,
  indexPage,
  pageSummaries,
  progressTracker,
} from './browser-page-fixtures'
import { MissingPageRootError, startBrowserPage } from './start-browser-page'

const responses: Readonly<Record<string, unknown>> = {
  [`/api/scratch-pads/${exportPad}/pages`]: { pages: pageSummaries },
  [`/api/scratch-pads/${exportPad}/pages/index.md`]: indexPage,
  [`/api/scratch-pads/${exportPad}/progress-tracker`]: progressTracker,
  [`/api/scratch-pads/${exportPad}/decision-log`]: { decisions: [] },
}

class FakeEventSource {
  static readonly opened: string[] = []

  constructor(url: string) {
    FakeEventSource.opened.push(url)
  }

  addEventListener(): void {
    return undefined
  }

  close(): void {
    return undefined
  }
}

beforeEach(() => {
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  vi.spyOn(window, 'fetch').mockImplementation((url) =>
    Promise.resolve(
      new Response(JSON.stringify(responses[String(url)], (_key, value: unknown) => value ?? null)),
    ),
  )
  window.history.replaceState(null, '', `/${exportPad}/`)
})

afterEach(() => {
  document.body.replaceChildren()
})

describe('startBrowserPage', () => {
  it('renders the scratch pad of the page and opens its stream of changes when the page has a root', async () => {
    document.body.innerHTML = `<div id="scratch-pad-page" data-scratch-pad="${exportPad}"></div>`
    startBrowserPage()
    expect((await screen.findByRole('heading', { level: 1, name: 'Invoice export' })).id).toBe(
      'invoice-export',
    )
    expect(FakeEventSource.opened).toContain(`/api/scratch-pads/${exportPad}/changes`)
  })

  it('renders the scratch pad from the data of the export without the server when the page is an export', async () => {
    document.body.innerHTML = [
      `<div id="scratch-pad-page" data-scratch-pad="${exportPad}"></div>`,
      `<script type="application/json" id="scratch-pad-export">${exportedPadJson}</script>`,
    ].join('')
    window.history.replaceState(null, '', '/Users/jo/export.html#/invoice-template.md')
    startBrowserPage()
    expect((await screen.findByRole('heading', { level: 1, name: 'Invoice template' })).id).toBe(
      'invoice-template',
    )
    expect(window.fetch).not.toHaveBeenCalled()
  })

  it('throws MissingPageRootError when the page doesn’t have a root', () => {
    expect(() => startBrowserPage()).toThrow(MissingPageRootError)
    expect(() => startBrowserPage()).toThrow(
      'The page doesn’t have an element with the id scratch-pad-page and a data-scratch-pad.',
    )
  })

  it('throws MissingPageRootError when the root doesn’t name a scratch pad', () => {
    document.body.innerHTML = '<div id="scratch-pad-page"></div>'
    expect(() => startBrowserPage()).toThrow(MissingPageRootError)
  })
})

describe('the entry of the bundle', () => {
  it('starts the browser page when the bundle is loaded', async () => {
    document.body.innerHTML = `<div id="scratch-pad-page" data-scratch-pad="${exportPad}"></div>`
    await import('./browser-page')
    expect((await screen.findByRole('heading', { level: 1, name: 'Invoice export' })).tagName).toBe(
      'H1',
    )
  })
})

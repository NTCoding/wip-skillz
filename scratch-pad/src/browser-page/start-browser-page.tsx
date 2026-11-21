import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserPageError } from './browser-page-error'
import { narrowAppFrameQuery } from './design-system/design-system'
import { exportedAddresses, servedAddresses } from './browser-route'
import { exportedScratchPad } from './exported-scratch-pad'
import { ScratchPadApp } from './scratch-pad-app'
import { scratchPadConnection } from './scratch-pad-connection'

export class MissingPageRootError extends BrowserPageError {
  constructor() {
    super('The page doesn’t have an element with the id scratch-pad-page and a data-scratch-pad.')
  }
}

const exportedDataId = 'scratch-pad-export'

function servedScratchPad(pad: string) {
  const connection = scratchPadConnection(pad, {
    fetch: (url, request) => window.fetch(url, request),
    openChangeStream: (url) => new EventSource(url),
  })
  return { addresses: servedAddresses(pad), connection, writing: connection }
}

function exportedScratchPadOf(pad: string, data: Element) {
  return {
    addresses: exportedAddresses(pad),
    connection: exportedScratchPad(String(data.textContent)),
    writing: undefined,
  }
}

export function startBrowserPage(): void {
  const root = document.getElementById('scratch-pad-page')
  const pad = root?.dataset['scratchPad']
  if (root === null || pad === undefined) {
    throw new MissingPageRootError()
  }
  const exportedData = document.getElementById(exportedDataId)
  const scratchPad =
    exportedData === null ? servedScratchPad(pad) : exportedScratchPadOf(pad, exportedData)
  createRoot(root).render(
    <StrictMode>
      <ScratchPadApp
        pad={pad}
        {...scratchPad}
        settings={window.localStorage}
        prefersDark={window.matchMedia('(prefers-color-scheme: dark)').matches}
        narrowWindow={window.matchMedia(narrowAppFrameQuery).matches}
      />
    </StrictMode>,
  )
}

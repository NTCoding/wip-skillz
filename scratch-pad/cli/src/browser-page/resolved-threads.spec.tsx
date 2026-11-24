import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type Thread } from './api-responses'
import {
  exportedPadJson,
  exportPad,
  exportPadAddresses,
  fakeConnection,
  fakeNarrowWindow,
  retryQuestion,
  toneNote,
  type FakeConnection,
} from './browser-page-fixtures'
import { exportedAddresses } from './browser-route'
import { exportedScratchPad } from './exported-scratch-pad'
import { ScratchPadApp } from './scratch-pad-app'

const resolvedQuestion: Thread = { ...retryQuestion, waitsFor: 'nobody' }

async function renderIndex(
  fake: FakeConnection = fakeConnection(),
  hash = '',
): Promise<FakeConnection> {
  window.history.replaceState(null, '', `/${exportPad}/${hash}`)
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
  return fake
}

function withResolvedQuestion(): FakeConnection {
  const fake = fakeConnection()
  fake.threads.set('index.md', [resolvedQuestion, toneNote])
  return fake
}

function itemOf(key: string): Element | null {
  return document.querySelector(`[data-key="${key}"]`)
}

function behindMarker(key: string): string | null | undefined {
  return itemOf(key)?.getAttribute('data-behind-marker')
}

function popupOf(key: string): string | null | undefined {
  return itemOf(key)?.getAttribute('data-popup')
}

function markerOf(name: string): HTMLElement {
  return screen.getByRole('button', { name })
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

describe('the resolved threads of a page', () => {
  it('hides the card of a thread that was already resolved behind its marker when the page opens', async () => {
    await renderIndex(withResolvedQuestion())
    expect([behindMarker('c-1'), behindMarker('g-1')]).toStrictEqual(['true', 'false'])
    expect(document.querySelector('[data-marker="c-1"]')?.getAttribute('data-behind-marker')).toBe(
      'true',
    )
  })

  it('shows the card of a resolved thread when Nick clicks its marker and hides it on a second click, on Escape or on a click outside the card', async () => {
    await renderIndex(withResolvedQuestion())
    await userEvent.click(markerOf('Comment c-1'))
    expect(popupOf('c-1')).toBe('true')
    await userEvent.click(markerOf('Comment c-1'))
    expect(popupOf('c-1')).toBe('false')
    await userEvent.click(markerOf('Comment c-1'))
    await userEvent.keyboard('{Escape}')
    expect(popupOf('c-1')).toBe('false')
    await userEvent.click(markerOf('Comment c-1'))
    fireEvent.pointerDown(screen.getByRole('heading', { level: 1 }))
    expect(popupOf('c-1')).toBe('false')
  })

  it('shows the card of a resolved thread when Nick follows a link to the thread', async () => {
    await renderIndex(withResolvedQuestion(), '#c-1')
    expect([behindMarker('c-1'), popupOf('c-1')]).toStrictEqual(['true', 'true'])
  })

  it('hides the card behind its marker and moves the focus to the marker without a scroll when Nick resolves the thread in a wide reading column', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1200)
    const focus = vi.spyOn(HTMLElement.prototype, 'focus')
    await renderIndex()
    await userEvent.click(screen.getByRole('button', { name: 'Resolve c-1' }))
    expect(await within(markerOf('Comment c-1')).findByText('2')).toBeDefined()
    expect([behindMarker('c-1'), popupOf('c-1')]).toStrictEqual(['true', 'false'])
    expect(document.activeElement).toBe(markerOf('Comment c-1'))
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true })
  })

  it('keeps the card open below its text when Nick resolves the thread in a narrow reading column', async () => {
    await renderIndex()
    await userEvent.click(markerOf('Comment c-1'))
    await userEvent.click(screen.getByRole('button', { name: 'Resolve c-1' }))
    expect(
      await within(screen.getByRole('region', { name: 'Comment c-1' })).findByText('Resolved'),
    ).toBeDefined()
    expect([behindMarker('c-1'), popupOf('c-1')]).toStrictEqual(['true', 'true'])
  })

  it('keeps the card of a note in the margin when the agent resolves the note while Nick is on the page', async () => {
    const fake = await renderIndex()
    fake.threads.set('index.md', [
      retryQuestion,
      { ...toneNote, waitsFor: 'nobody', outcome: 'Wrote who shows the tax number.' },
    ])
    act(() => fake.sendChange({ kind: 'thread', id: 'g-1' }))
    expect(
      await within(screen.getByRole('region', { name: 'Grammar / tone g-1' })).findByText(
        'Done: Wrote who shows the tax number.',
      ),
    ).toBeDefined()
    expect(behindMarker('g-1')).toBe('false')
  })

  it('keeps the card in the margin when the agent resolves a thread that Nick has resolved and reopened', async () => {
    const fake = await renderIndex()
    await userEvent.click(screen.getByRole('button', { name: 'Resolve c-1' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Reply to reopen…' }), 'Why 8?')
    await userEvent.click(screen.getByRole('button', { name: 'Reopen' }))
    expect(behindMarker('c-1')).toBe('false')
    const reopened: Thread = {
      ...retryQuestion,
      waitsFor: 'nobody',
      messages: [
        ...retryQuestion.messages,
        { author: 'nick', text: 'Why 8?', time: '2026-11-20T21:21:00.000Z' },
      ],
    }
    fake.threads.set('index.md', [reopened, toneNote])
    act(() => fake.sendChange({ kind: 'thread', id: 'c-1' }))
    expect(
      await within(screen.getByRole('region', { name: 'Comment c-1' })).findByText('Resolved'),
    ).toBeDefined()
    expect(behindMarker('c-1')).toBe('false')
  })

  it('hides the card of a note that the agent resolved while Nick was on the page and moves the focus to its marker when Nick presses Hide in a wide reading column', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1200)
    const fake = await renderIndex()
    fake.threads.set('index.md', [retryQuestion, { ...toneNote, waitsFor: 'nobody' }])
    act(() => fake.sendChange({ kind: 'thread', id: 'g-1' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Hide g-1' }))
    expect([behindMarker('g-1'), popupOf('g-1')]).toStrictEqual(['true', 'false'])
    expect(document.activeElement).toBe(markerOf('Grammar / tone g-1'))
  })

  it('closes the card of a note that the agent resolved while Nick was on the page and moves the focus to its marker when Nick presses Hide in a narrow reading column', async () => {
    const fake = await renderIndex()
    fake.threads.set('index.md', [retryQuestion, { ...toneNote, waitsFor: 'nobody' }])
    act(() => fake.sendChange({ kind: 'thread', id: 'g-1' }))
    await userEvent.click(markerOf('Grammar / tone g-1'))
    await userEvent.click(await screen.findByRole('button', { name: 'Hide g-1' }))
    expect([behindMarker('g-1'), popupOf('g-1')]).toStrictEqual(['true', 'false'])
    expect(document.activeElement).toBe(markerOf('Grammar / tone g-1'))
  })

  it('closes the card that Nick opened from its marker and moves the focus to the marker when he presses Hide in a wide reading column', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1200)
    await renderIndex(withResolvedQuestion())
    await userEvent.click(markerOf('Comment c-1'))
    await userEvent.click(screen.getByRole('button', { name: 'Hide c-1' }))
    expect([behindMarker('c-1'), popupOf('c-1')]).toStrictEqual(['true', 'false'])
    expect(document.activeElement).toBe(markerOf('Comment c-1'))
  })

  it('keeps the card of the active thread open when Nick hides the card of another thread', async () => {
    const fake = fakeConnection()
    fake.threads.set('index.md', [resolvedQuestion, { ...toneNote, waitsFor: 'nobody' }])
    await renderIndex(fake, '#c-1')
    fireEvent.click(screen.getByRole('button', { name: 'Hide g-1' }))
    expect([popupOf('c-1'), popupOf('g-1')]).toStrictEqual(['true', 'false'])
  })

  it('closes the card that Nick opened from its marker when he presses Hide and shows the card again from the marker or in the margin after a reply', async () => {
    await renderIndex(withResolvedQuestion())
    await userEvent.click(markerOf('Comment c-1'))
    await userEvent.click(screen.getByRole('button', { name: 'Hide c-1' }))
    expect([behindMarker('c-1'), popupOf('c-1')]).toStrictEqual(['true', 'false'])
    expect(document.activeElement).toBe(markerOf('Comment c-1'))
    await userEvent.click(markerOf('Comment c-1'))
    expect(popupOf('c-1')).toBe('true')
    await userEvent.type(screen.getByRole('textbox', { name: 'Reply to reopen…' }), 'Why 8?')
    await userEvent.click(screen.getByRole('button', { name: 'Reopen' }))
    expect(behindMarker('c-1')).toBe('false')
  })

  it('hides a resolved thread behind its marker and shows its card from the marker when the export is opened', async () => {
    window.history.replaceState(null, '', '/Users/jo/invoice-export/export.html')
    render(
      <ScratchPadApp
        pad={exportPad}
        addresses={exportedAddresses(exportPad)}
        connection={exportedScratchPad(
          exportedPadJson.replace('"waitsFor":"nick"', '"waitsFor":"nobody"'),
        )}
        writing={undefined}
        settings={window.localStorage}
        narrowWindow={fakeNarrowWindow()}
      />,
    )
    await screen.findByRole('region', { name: 'Comment c-1' })
    expect(behindMarker('c-1')).toBe('true')
    await userEvent.click(markerOf('Comment c-1'))
    expect(popupOf('c-1')).toBe('true')
  })
})

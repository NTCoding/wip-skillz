import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  exportPad,
  exportPadAddresses,
  fakeConnection,
  fakeNarrowWindow,
  type FakeConnection,
} from './browser-page-fixtures'
import { queuedComment, queuedReply } from './outbox-fixtures'
import { ScratchPadApp } from './scratch-pad-app'

function renderApp(path: string, fake: FakeConnection): void {
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

function fakeWithQueuedItems(): FakeConnection {
  const fake = fakeConnection()
  fake.outbox.push(queuedComment, queuedReply)
  return fake
}

async function openOutboxOnInvoiceTemplate(fake: FakeConnection): Promise<void> {
  renderApp(`/${exportPad}/invoice-template.md`, fake)
  await screen.findByRole('heading', { name: 'Invoice template', level: 1 })
  const button = await screen.findByRole('button', { name: /^Outbox: 2 items/ })
  await userEvent.click(button)
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

describe('the Outbox in the top bar', () => {
  it('lists each queued comment and reply with its place, its quote and Nick’s text', async () => {
    await openOutboxOnInvoiceTemplate(fakeWithQueuedItems())
    expect((await screen.findAllByRole('menuitem')).map((item) => item.textContent)).toStrictEqual([
      'CommentQueued 20 Nov, 21:14Invoice exportpaid invoicesOnly the paid ones?Show on the page',
      'ReplyQueued 20 Nov, 21:15Invoice exportretries 5 timesCan a shop ask for 10?Show on the page',
    ])
  })

  it('opens the page of a queued comment and makes its card active when Nick clicks Show on the page', async () => {
    await openOutboxOnInvoiceTemplate(fakeWithQueuedItems())
    await userEvent.click(await screen.findByRole('menuitem', { name: /Only the paid ones/ }))

    expect(`${window.location.pathname}${window.location.hash}`).toBe(`/${exportPad}/#outbox-1`)
    const card = await screen.findByRole('region', { name: 'Comment in the outbox' })
    expect(card.getAttribute('data-active')).toBe('true')
    expect(screen.queryByRole('group', { name: 'Outbox' })).toBeNull()
  })

  it('opens the card of the thread of a queued reply when Nick clicks Show on the page', async () => {
    await openOutboxOnInvoiceTemplate(fakeWithQueuedItems())
    await userEvent.click(await screen.findByRole('menuitem', { name: /Can a shop ask for 10/ }))

    expect(`${window.location.pathname}${window.location.hash}`).toBe(`/${exportPad}/#c-1`)
    const card = await screen.findByRole('region', { name: 'Comment c-1' })
    expect(card.getAttribute('data-active')).toBe('true')
  })

  it('doesn’t load the threads of the scratch pad when the outbox doesn’t have any replies', async () => {
    const fake = fakeConnection()
    const threadsOfPad = vi.spyOn(fake.connection, 'threadsOfPad')
    fake.outbox.push(queuedComment)
    renderApp(`/${exportPad}/invoice-template.md`, fake)
    await userEvent.click(await screen.findByRole('button', { name: /^Outbox: 1 item/ }))

    expect(await screen.findAllByRole('menuitem')).toHaveLength(1)
    expect(threadsOfPad).not.toHaveBeenCalled()
  })

  it('counts a reply to a thread that it can’t find but leaves the reply out of the list', async () => {
    const fake = fakeConnection()
    fake.outbox.push({ ...queuedReply, thread: 'c-404' })
    renderApp(`/${exportPad}/invoice-template.md`, fake)
    await userEvent.click(await screen.findByRole('button', { name: /^Outbox: 1 item/ }))

    expect(screen.getByRole('group', { name: 'Outbox' }).textContent).toContain(
      '1 item is in the outbox.',
    )
    expect(screen.queryByRole('menu')).toBeNull()
  })
})

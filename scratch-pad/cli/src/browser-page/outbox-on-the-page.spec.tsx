import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  exportPad,
  exportPadAddresses,
  fakeConnection,
  fakeNarrowWindow,
  retryQuestion,
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

async function renderIndex(fake: FakeConnection = fakeConnection()) {
  renderApp(`/${exportPad}/`, fake)
  await screen.findByRole('region', { name: 'Comment c-1' })
  return fake
}

function fakeWithQueuedItems(): FakeConnection {
  const fake = fakeConnection()
  fake.outbox.push(queuedComment, queuedReply)
  return fake
}

function selectInBlock(lines: string, from: number, to: number): void {
  const text = document.querySelector(`[data-lines="${lines}"]`)?.firstChild ?? document.body
  const range = document.createRange()
  range.setStart(text, from)
  range.setEnd(text, to)
  document.getSelection()?.removeAllRanges()
  document.getSelection()?.addRange(range)
  fireEvent.mouseUp(document.body)
}

function card(name: string): HTMLElement {
  return screen.getByRole('region', { name })
}

function outboxButton(): HTMLElement {
  return screen.getByRole('button', { name: /^Outbox/ })
}

beforeEach(() => {
  window.localStorage.setItem('scratch-pad-draft-mode', 'on')
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

describe('the outbox on a page', () => {
  it('adds a new comment to the outbox rather than sending it when Nick clicks Add to outbox', async () => {
    const fake = await renderIndex()
    const queueComment = vi.spyOn(fake.connection, 'queueComment')
    const startThread = vi.spyOn(fake.connection, 'startThread')
    selectInBlock('3-4', 4, 14)
    await userEvent.click(screen.getByRole('button', { name: 'Comment' }))
    await userEvent.keyboard('Is the job nightly?')
    await userEvent.click(screen.getByRole('button', { name: 'Add to outbox' }))

    expect(queueComment).toHaveBeenCalledWith({
      type: 'comment',
      page: 'pages/index.md',
      firstLine: 3,
      lastLine: 4,
      selectedText: 'export job',
      prefix: 'The',
      suffix: 'writes the paid invoices of each',
      message: 'Is the job nightly?',
    })
    expect(startThread).not.toHaveBeenCalled()
  })

  it('shows the queued comment in the margin with the label In outbox and highlights its text', async () => {
    await renderIndex()
    selectInBlock('3-4', 4, 14)
    await userEvent.click(screen.getByRole('button', { name: 'Comment' }))
    await userEvent.keyboard('Is the job nightly?')
    await userEvent.click(screen.getByRole('button', { name: 'Add to outbox' }))

    const queued = await screen.findByRole('region', { name: 'Comment in the outbox' })
    expect([
      queued.textContent,
      screen.queryByRole('region', { name: 'New comment' }),
    ]).toStrictEqual(['NNick20 Nov, 21:14Is the job nightly?In outboxEditRemove', null])
    expect(document.querySelector('[data-highlight="outbox-1"]')?.textContent).toBe('export job')
    expect(outboxButton().getAttribute('aria-label')).toBe('Outbox: 1 item is in the outbox.')
  })

  it('opens the queued comment at full size when Nick clicks the expand button of its card', async () => {
    await renderIndex(fakeWithQueuedItems())
    const queued = await screen.findByRole('region', { name: 'Comment in the outbox' })
    expect(within(queued).queryByRole('blockquote')).toBeNull()

    await userEvent.click(
      within(queued).getByRole('button', { name: 'Open the comment in the outbox at full size' }),
    )

    const view = screen.getByRole('dialog', { name: 'Comment in the outbox' })
    expect(within(view).getByRole('button', { name: 'Edit' })).not.toBeNull()
    expect(within(view).getByRole('blockquote').textContent).toBe(
      'The export job writes the paid invoices of each shop to a CSV file.',
    )
  })

  it('keeps the edit of a queued comment and only closes the full size view when Nick presses Escape in the edit at full size', async () => {
    await renderIndex(fakeWithQueuedItems())
    const queued = await screen.findByRole('region', { name: 'Comment in the outbox' })
    await userEvent.click(
      within(queued).getByRole('button', { name: 'Open the comment in the outbox at full size' }),
    )
    const view = screen.getByRole('dialog', { name: 'Comment in the outbox' })
    await userEvent.click(within(view).getByRole('button', { name: 'Edit' }))
    await userEvent.type(
      within(view).getByRole('textbox', { name: 'Edit the comment' }),
      ' Or all of them?',
    )
    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(within(queued).getByRole('textbox', { name: 'Edit the comment' })).toHaveProperty(
      'value',
      'Only the paid ones? Or all of them?',
    )
  })

  it('doesn’t offer the outbox for a new grammar note', async () => {
    await renderIndex()
    selectInBlock('3-4', 4, 14)
    await userEvent.click(screen.getByRole('button', { name: 'Grammar / tone' }))
    await userEvent.keyboard('Write who runs it.')
    expect(screen.queryByRole('button', { name: 'Add to outbox' })).toBeNull()
  })

  it('adds a reply to the outbox and shows it in its thread with the label In outbox', async () => {
    const fake = await renderIndex()
    const queueReply = vi.spyOn(fake.connection, 'queueReply')
    const replyToThread = vi.spyOn(fake.connection, 'replyToThread')
    await userEvent.type(
      within(card('Comment c-1')).getByRole('textbox', { name: 'Write a reply…' }),
      'Can a shop ask for 10?',
    )
    await userEvent.click(
      within(card('Comment c-1')).getByRole('button', { name: 'Add to outbox' }),
    )

    expect(queueReply).toHaveBeenCalledWith('c-1', 'Can a shop ask for 10?')
    expect(replyToThread).not.toHaveBeenCalled()
    const reply = await within(card('Comment c-1')).findByRole('group', { name: 'Reply' })
    expect(reply.textContent).toContain('Can a shop ask for 10?')
    expect(reply.textContent).toContain('In outbox')
  })

  it('opens the whole thread at full size and adds a reply to the outbox there when Nick clicks the expand button of a card', async () => {
    await renderIndex()
    await userEvent.click(screen.getByRole('button', { name: 'Open c-1 at full size' }))
    const view = screen.getByRole('dialog', { name: 'Thread on “retries 5 times”' })
    expect(within(view).getByRole('blockquote').textContent).toBe(
      'The job retries 5 times. See this section and the retry',
    )
    await userEvent.type(within(view).getByRole('textbox', { name: 'Write a reply…' }), 'Why 8?')
    await userEvent.click(within(view).getByRole('button', { name: 'Add to outbox' }))
    expect(await within(view).findByText('Why 8?')).toBeDefined()
  })

  it('doesn’t offer the outbox for a reply to a grammar note', async () => {
    await renderIndex()
    await userEvent.type(
      within(card('Grammar / tone g-1')).getByRole('textbox', { name: 'Write a reply…' }),
      'And the tone?',
    )
    expect(
      within(card('Grammar / tone g-1')).queryByRole('button', { name: 'Add to outbox' }),
    ).toBeNull()
  })

  it('shows the queued comments of this page and the queued replies to its threads after a reload', async () => {
    const fake = fakeWithQueuedItems()
    fake.outbox.push({ ...queuedComment, number: 3, page: 'pages/invoice-template.md' })
    await renderIndex(fake)

    expect(await screen.findAllByRole('region', { name: 'Comment in the outbox' })).toHaveLength(1)
    expect(within(card('Comment c-1')).getByRole('group', { name: 'Reply' })).toBeDefined()
    expect(outboxButton().textContent).toBe('Outbox3')
  })

  it('scrolls to a queued comment when Nick opens a link to it and the outbox loads after the threads', async () => {
    const fake = fakeWithQueuedItems()
    const loadOutbox = fake.connection.outbox
    const outboxLoaded = Promise.withResolvers<void>()
    vi.spyOn(fake.connection, 'outbox').mockImplementation(async () => {
      await outboxLoaded.promise
      return loadOutbox()
    })
    renderApp(`/${exportPad}/#outbox-1`, fake)
    await screen.findByRole('region', { name: 'Comment c-1' })
    outboxLoaded.resolve()

    await vi.waitFor(() =>
      expect(document.getElementById('outbox-1')?.getAttribute('data-scrolled-into-view')).toBe(
        'true',
      ),
    )
  })

  it('saves the new text when Nick edits a queued comment', async () => {
    const fake = fakeWithQueuedItems()
    const editQueuedItem = vi.spyOn(fake.connection, 'editQueuedItem')
    await renderIndex(fake)
    const queued = await screen.findByRole('region', { name: 'Comment in the outbox' })
    await userEvent.click(within(queued).getByRole('button', { name: 'Edit' }))
    const field = within(queued).getByRole('textbox', { name: 'Edit the comment' })
    await userEvent.clear(field)
    await userEvent.type(field, 'Only the paid invoices?{Enter}')

    expect(editQueuedItem).toHaveBeenCalledWith(1, 'Only the paid invoices?')
    expect(await within(queued).findByText('Only the paid invoices?')).toBeDefined()
  })

  it('removes a queued reply from its thread and from the count of the outbox when Nick removes it', async () => {
    const fake = fakeWithQueuedItems()
    const removeQueuedItem = vi.spyOn(fake.connection, 'removeQueuedItem')
    await renderIndex(fake)
    const reply = await within(card('Comment c-1')).findByRole('group', { name: 'Reply' })
    await userEvent.click(within(reply).getByRole('button', { name: 'Remove' }))

    expect(removeQueuedItem).toHaveBeenCalledWith(2)
    await vi.waitFor(() =>
      expect(within(card('Comment c-1')).queryByRole('group', { name: 'Reply' })).toBeNull(),
    )
    expect(outboxButton().textContent).toBe('Outbox1')
  })

  it('sends every queued item and empties the outbox when Nick clicks Send all', async () => {
    const fake = fakeWithQueuedItems()
    const sendOutbox = vi.spyOn(fake.connection, 'sendOutbox')
    await renderIndex(fake)
    await screen.findByRole('region', { name: 'Comment in the outbox' })
    await userEvent.click(outboxButton())
    await userEvent.click(screen.getByRole('button', { name: 'Send all' }))

    expect(sendOutbox).toHaveBeenCalledOnce()
    await vi.waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Comment in the outbox' })).toBeNull(),
    )
    expect(outboxButton().textContent).toBe('Outbox')
  })

  it('disables Send all while Nick edits a queued comment and enables it again once he saves the edit', async () => {
    const fake = fakeWithQueuedItems()
    const sendOutbox = vi.spyOn(fake.connection, 'sendOutbox')
    await renderIndex(fake)
    const queued = await screen.findByRole('region', { name: 'Comment in the outbox' })
    await userEvent.click(within(queued).getByRole('button', { name: 'Edit' }))
    await userEvent.type(
      within(queued).getByRole('textbox', { name: 'Edit the comment' }),
      ' Or all of them?',
    )
    await userEvent.click(outboxButton())
    const panel = screen.getByRole('group', { name: 'Outbox' })
    expect(panel.textContent).toContain('Save or cancel your edit to send the outbox.')
    await userEvent.click(within(panel).getByRole('button', { name: 'Send all' }))
    expect(sendOutbox).not.toHaveBeenCalled()

    await userEvent.click(within(queued).getByRole('button', { name: 'Save' }))
    await userEvent.click(outboxButton())
    expect(screen.getByRole('button', { name: 'Send all' })).toHaveProperty('disabled', false)
    expect(screen.getByRole('group', { name: 'Outbox' }).textContent).not.toContain(
      'Save or cancel',
    )
  })

  it('shows an item that was queued in another tab once the server reports the change', async () => {
    const fake = await renderIndex()
    fake.outbox.push(queuedComment)
    act(() => fake.sendChange({ kind: 'outbox' }))
    expect(await screen.findByRole('region', { name: 'Comment in the outbox' })).toBeDefined()
  })

  it('shows a queued comment without a highlight when its text has been deleted from the page', async () => {
    const fake = fakeConnection()
    fake.outbox.push({ ...queuedComment, position: { kind: 'detached' } })
    await renderIndex(fake)
    expect(await screen.findByRole('region', { name: 'Comment in the outbox' })).toBeDefined()
    expect(document.querySelector('[data-highlight="outbox-1"]')).toBeNull()
  })

  it('makes the queued comment the active card when it receives the focus', async () => {
    await renderIndex(fakeWithQueuedItems())
    const queued = await screen.findByRole('region', { name: 'Comment in the outbox' })
    act(() => queued.focus())
    expect(queued.getAttribute('data-active')).toBe('true')
  })
})

describe('the marker of a queued comment on a narrow page', () => {
  function popupOfQueued(): string | null | undefined {
    return card('Comment in the outbox').parentElement?.getAttribute('data-popup')
  }

  it('opens the queued comment when Nick clicks its marker and closes it on a second click', async () => {
    await renderIndex(fakeWithQueuedItems())
    const marker = await screen.findByRole('button', { name: 'Comment in the outbox' })
    await userEvent.click(marker)
    expect(popupOfQueued()).toBe('true')
    await userEvent.click(marker)
    expect(popupOfQueued()).toBe('false')
  })

  it('ignores a click on the marker while Nick writes a new thread', async () => {
    await renderIndex(fakeWithQueuedItems())
    const marker = await screen.findByRole('button', { name: 'Comment in the outbox' })
    selectInBlock('8-8', 0, 3)
    await userEvent.click(screen.getByRole('button', { name: 'Comment' }))
    await userEvent.click(marker)
    expect(popupOfQueued()).toBe('false')
  })
})

describe('the outbox on a deleted page', () => {
  function fakeWithDeletedPage(): FakeConnection {
    const fake = fakeConnection()
    const onDeletedPage = { ...retryQuestion, id: 'c-4', page: 'pages/queue.md' }
    vi.spyOn(fake.connection, 'nickInbox').mockResolvedValue({
      threads: [onDeletedPage],
      decisions: [],
    })
    fake.outbox.push(
      { ...queuedComment, page: 'pages/queue.md' },
      { ...queuedReply, thread: 'c-4' },
      { ...queuedComment, number: 3, text: 'Is this on the index page?' },
    )
    return fake
  }

  it('shows the queued comments on the deleted page and the queued replies to its threads', async () => {
    renderApp(`/${exportPad}/queue.md`, fakeWithDeletedPage())
    const queued = await screen.findAllByRole('region', { name: 'Comment in the outbox' })
    const reply = within(card('Comment c-4')).getByRole('group', { name: 'Reply' })
    expect([
      queued.map((each) => each.textContent),
      screen.getByText('paid invoices').tagName,
      reply.textContent,
    ]).toStrictEqual([
      ['NNick20 Nov, 21:14Only the paid ones?In outboxEditRemove'],
      'BLOCKQUOTE',
      'NNick20 Nov, 21:15Can a shop ask for 10?In outboxEditRemove',
    ])
    expect(screen.getByRole('note').textContent).toBe(
      'The agent has deleted this page. The comments below still wait for you. You can reply to them or resolve them here. Your outbox still contains items for this page. You can edit them or remove them here.',
    )
  })

  it('shows a thread that waits for the agent on the deleted page when the thread has a queued reply', async () => {
    const fake = fakeConnection()
    const waitsForAgent = {
      ...retryQuestion,
      id: 'c-5',
      page: 'pages/queue.md',
      waitsFor: 'agent' as const,
    }
    fake.threads.set('queue.md', [waitsForAgent, { ...waitsForAgent, id: 'c-6' }])
    fake.outbox.push({ ...queuedReply, thread: 'c-5' })
    const removeQueuedItem = vi.spyOn(fake.connection, 'removeQueuedItem')
    renderApp(`/${exportPad}/queue.md`, fake)
    const thread = await screen.findByRole('region', { name: 'Comment c-5' })
    const reply = within(thread).getByRole('group', { name: 'Reply' })
    expect([
      screen.queryByRole('region', { name: 'Comment c-6' }),
      screen.getByRole('note').textContent,
    ]).toStrictEqual([
      null,
      'The agent has deleted this page. Your outbox still contains items for this page. You can edit them or remove them here.',
    ])
    await userEvent.click(within(reply).getByRole('button', { name: 'Remove' }))
    expect(removeQueuedItem).toHaveBeenCalledWith(2)
    await vi.waitFor(() => expect(screen.queryByRole('region', { name: 'Comment c-5' })).toBeNull())
  })

  it('saves the new text when Nick edits a queued comment on the deleted page', async () => {
    const fake = fakeWithDeletedPage()
    const editQueuedItem = vi.spyOn(fake.connection, 'editQueuedItem')
    renderApp(`/${exportPad}/queue.md`, fake)
    const queued = await screen.findByRole('region', { name: 'Comment in the outbox' })
    await userEvent.click(within(queued).getByRole('button', { name: 'Edit' }))
    const field = within(queued).getByRole('textbox', { name: 'Edit the comment' })
    await userEvent.clear(field)
    await userEvent.type(field, 'Only the unpaid ones?{Enter}')

    expect(editQueuedItem).toHaveBeenCalledWith(1, 'Only the unpaid ones?')
    expect(await within(queued).findByText('Only the unpaid ones?')).toBeDefined()
  })

  it('removes a queued comment from the deleted page and from the count of the outbox when Nick removes it', async () => {
    const fake = fakeConnection()
    fake.outbox.push({ ...queuedComment, page: 'pages/queue.md' })
    const removeQueuedItem = vi.spyOn(fake.connection, 'removeQueuedItem')
    renderApp(`/${exportPad}/queue.md`, fake)
    const queued = await screen.findByRole('region', { name: 'Comment in the outbox' })
    await userEvent.click(within(queued).getByRole('button', { name: 'Remove' }))

    expect(removeQueuedItem).toHaveBeenCalledWith(1)
    await vi.waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Comment in the outbox' })).toBeNull(),
    )
    expect([outboxButton().textContent, screen.getByRole('status').textContent]).toStrictEqual([
      'Outbox',
      'There isn’t any page called queue.md in this scratch pad.',
    ])
  })

  it('says that the outbox contains comments on the deleted page when the page doesn’t have any threads', async () => {
    const fake = fakeConnection()
    fake.outbox.push({ ...queuedComment, page: 'pages/queue.md' })
    renderApp(`/${exportPad}/queue.md`, fake)
    await screen.findByRole('region', { name: 'Comment in the outbox' })
    expect(screen.getByRole('note').textContent).toBe(
      'The agent has deleted this page. Your outbox still contains items for this page. You can edit them or remove them here.',
    )
  })
})

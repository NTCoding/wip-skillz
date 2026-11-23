import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type Thread } from './api-responses'
import {
  exportPad,
  fakeNarrowWindow,
  exportPadAddresses,
  fakeConnection,
  indexPage,
  retryQuestion,
  toneNote,
  type FakeConnection,
} from './browser-page-fixtures'
import { queuedComment } from './outbox-fixtures'
import { withPostedThreads } from './page-with-threads'
import { ScratchPadApp } from './scratch-pad-app'

async function renderIndex(fake: FakeConnection = fakeConnection()) {
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

function popupOf(name: string): string | null | undefined {
  return card(name).parentElement?.getAttribute('data-popup')
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

describe('the threads of a page', () => {
  it('shows a card for each thread with its state and highlights the selected text', async () => {
    await renderIndex()
    expect(within(card('Comment c-1')).getByText('The agent replied')).toBeDefined()
    expect(within(card('Grammar / tone g-1')).getByText('Sent to the agent')).toBeDefined()
    const marks = [...document.querySelectorAll('[data-highlight="c-1"]')]
    expect(marks.map((mark) => mark.textContent).join('')).toBe('retries 5 times')
  })

  it('posts a comment with the lines of the block and the selected text when Nick selects text and writes a comment', async () => {
    const fake = await renderIndex()
    const startThread = vi.spyOn(fake.connection, 'startThread')
    selectInBlock('3-4', 4, 14)
    await userEvent.click(screen.getByRole('button', { name: 'Comment' }))
    await userEvent.keyboard('Is the job nightly?{Enter}')
    expect(startThread).toHaveBeenCalledWith({
      type: 'comment',
      page: 'pages/index.md',
      firstLine: 3,
      lastLine: 4,
      selectedText: 'export job',
      prefix: 'The',
      suffix: 'writes the paid invoices of each',
      message: 'Is the job nightly?',
    })
    expect(
      within(await screen.findByRole('region', { name: 'Comment c-9' })).getByText(
        'Sent to the agent',
      ),
    ).toBeDefined()
  })

  it('posts a grammar note and an improvement note when Nick picks those kinds', async () => {
    const fake = await renderIndex()
    const startThread = vi.spyOn(fake.connection, 'startThread')
    selectInBlock('3-4', 4, 14)
    await userEvent.click(screen.getByRole('button', { name: 'Grammar / tone' }))
    await userEvent.keyboard('Write who runs it.{Enter}')
    selectInBlock('3-4', 0, 3)
    await userEvent.click(screen.getByRole('button', { name: 'Improvement' }))
    await userEvent.keyboard('Add the time.{Enter}')
    expect(
      startThread.mock.calls.map(([thread]) => [thread.type, thread.selectedText]),
    ).toStrictEqual([
      ['grammar', 'export job'],
      ['improvement', 'The'],
    ])
  })

  it('removes the draft and its highlight when Nick cancels it', async () => {
    await renderIndex()
    selectInBlock('3-4', 4, 14)
    await userEvent.click(screen.getByRole('button', { name: 'Comment' }))
    expect(document.querySelector('[data-highlight="draft"]')?.textContent).toBe('export job')
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: 'New comment' })).toBeNull()
    expect(document.querySelector('[data-highlight="draft"]')).toBeNull()
  })

  it('highlights the copy that Nick selected in the draft when the block contains the text twice', async () => {
    await renderIndex()
    selectInBlock('3-4', 68, 71)
    await userEvent.click(screen.getByRole('button', { name: 'Comment' }))
    const mark = document.querySelector('[data-highlight="draft"]')
    expect(mark?.textContent).toBe('The')
    expect(mark?.previousSibling?.textContent).toContain('CSV file.')
  })

  it('posts a comment on the whole block when Nick presses the comment button of an html block', async () => {
    const fake = await renderIndex()
    const startThread = vi.spyOn(fake.connection, 'startThread')
    await userEvent.click(screen.getByRole('button', { name: 'Comment on the HTML block' }))
    await userEvent.keyboard('Add the step that writes the file.{Enter}')
    expect(startThread).toHaveBeenCalledWith({
      type: 'comment',
      page: 'pages/index.md',
      firstLine: 19,
      lastLine: 20,
      selectedText: '',
      prefix: '',
      suffix: '',
      message: 'Add the step that writes the file.',
    })
  })

  it('starts an empty draft when Nick selects other text while a draft is open', async () => {
    await renderIndex()
    selectInBlock('3-4', 4, 14)
    await userEvent.click(screen.getByRole('button', { name: 'Comment' }))
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Write a comment…' }),
      'Is the job nightly?',
    )
    selectInBlock('8-8', 0, 3)
    await userEvent.click(screen.getByRole('button', { name: 'Comment' }))
    expect(screen.getByRole('textbox', { name: 'Write a comment…' })).toHaveProperty('value', '')
  })

  it('doesn’t start a draft when the html block doesn’t have valid lines', async () => {
    const fake = fakeConnection()
    fake.pages.set('index.md', {
      ...indexPage,
      html: indexPage.html.replace('data-lines="19-20"', 'data-lines="19"'),
    })
    await renderIndex(fake)
    await userEvent.click(screen.getByRole('button', { name: 'Comment on the HTML block' }))
    expect(screen.queryByRole('region', { name: 'New comment' })).toBeNull()
  })

  it('hides the selection tools when the focus leaves them', async () => {
    await renderIndex()
    selectInBlock('3-4', 4, 14)
    await userEvent.tab()
    expect(document.activeElement?.textContent).toBe('Comment')
    await userEvent.tab()
    expect(screen.queryByRole('toolbar')).toBeNull()
  })

  it('hides the selection tools when Nick presses Escape and shows them again after a selection with the keyboard', async () => {
    await renderIndex()
    selectInBlock('3-4', 4, 14)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('toolbar')).toBeNull()
    fireEvent.keyUp(document.body, { key: 'a' })
    expect(screen.queryByRole('toolbar')).toBeNull()
    fireEvent.keyUp(document.body, { key: 'ArrowRight', shiftKey: true })
    expect(screen.getByRole('toolbar')).toBeDefined()
  })

  it('shows Nick’s reply on the card at once when Nick replies to the agent', async () => {
    const fake = await renderIndex()
    const replyToThread = vi.spyOn(fake.connection, 'replyToThread')
    await userEvent.type(
      within(card('Comment c-1')).getByRole('textbox', { name: 'Write a reply…' }),
      'Thanks.{Enter}',
    )
    expect(replyToThread).toHaveBeenCalledWith('c-1', 'Thanks.')
    expect(within(card('Comment c-1')).getByText('Thanks.')).toBeDefined()
  })

  it('shows the thread as resolved without its highlight when Nick resolves it', async () => {
    await renderIndex()
    await userEvent.click(screen.getByRole('button', { name: 'Resolve c-1' }))
    expect(within(card('Comment c-1')).getByText('Resolved')).toBeDefined()
    expect(document.querySelector('[data-highlight="c-1"]')).toBeNull()
  })

  it('shows the reply of the agent without a reload when the thread changes on the server', async () => {
    const fake = await renderIndex()
    const answered: Thread = {
      ...retryQuestion,
      messages: [
        ...retryQuestion.messages,
        { author: 'agent', text: 'I have added the wait time.', time: '2026-11-20T21:30:00.000Z' },
      ],
    }
    fake.threads.set('index.md', [answered])
    act(() => fake.sendChange({ kind: 'thread', id: 'c-1' }))
    expect(await screen.findByText('I have added the wait time.')).toBeDefined()
  })

  it('marks the card when the server returns a detached thread after the agent changed the page', async () => {
    const fake = await renderIndex()
    fake.pages.set('index.md', {
      ...indexPage,
      html: '<h1 data-lines="1-1">Invoice export</h1><p data-lines="3-5">The job stops.</p>',
    })
    fake.threads.set('index.md', [{ ...retryQuestion, position: { kind: 'detached' } }])
    act(() => fake.sendChange({ kind: 'page', page: 'pages/index.md' }))
    expect(await within(card('Comment c-1')).findByText('The text has changed')).toBeDefined()
  })

  it('moves the decision into the margin and opens its card there when Nick answers a decision', async () => {
    const fake = await renderIndex()
    const answerDecision = vi.spyOn(fake.connection, 'answerDecision')
    await userEvent.click(screen.getByRole('button', { name: 'Proposal' }))
    expect(answerDecision).toHaveBeenCalledWith('d-1', 'pages/index.md', { choice: 'proposal' })
    expect((await screen.findByRole('status', { name: '' })).textContent).toBe(
      "Nick's answer: proposal",
    )
    expect(card('Decision d-1').closest('[data-key]')?.getAttribute('data-key')).toBe('d-1')
    expect(screen.queryByRole('button', { name: 'Proposal' })).toBeNull()
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

  it('labels the full size view as a thread when a thread doesn’t have the text around its selection', async () => {
    const fake = fakeConnection()
    const anchor = { firstLine: 8, lastLine: 8, selectedText: '' }
    fake.threads.set('index.md', [
      { ...retryQuestion, anchor: { ...anchor, prefix: undefined, suffix: undefined } },
      { ...toneNote, anchor: undefined },
    ])
    await renderIndex(fake)
    await userEvent.click(screen.getByRole('button', { name: 'Open c-1 at full size' }))
    expect(screen.getByRole('dialog').getAttribute('aria-label')).toBe('Thread')
  })
})

describe('the decisions that Nick has answered', () => {
  async function renderAnswered() {
    const fake = fakeConnection()
    fake.pages.set('index.md', {
      ...indexPage,
      decisions: [
        {
          id: 'd-1',
          question: 'Will the export job retry 8 times?',
          answer: { choice: 'alternative' },
        },
      ],
    })
    const decisionText = {
      kind: 'attached',
      firstLine: 28,
      lastLine: 32,
      text: 'Raise the retry limit',
      occurrence: 0,
      match: 'exact',
      score: 1,
    } as const
    const onDecision: Thread = { ...retryQuestion, id: 'c-2', position: decisionText }
    fake.threads.set('index.md', [retryQuestion, onDecision])
    fake.outbox.push({ ...queuedComment, position: decisionText })
    await renderIndex(fake)
  }

  it('shows the marker of the decision, its thread and its comment in the outbox beside its question rather than the decision in the text', async () => {
    await renderAnswered()
    expect(screen.queryByRole('region', { name: 'Decision d-1' })).toBeNull()
    const anchorLines = ['[data-marker="d-1"]', '[data-key="c-2"]', '[data-key="outbox-1"]'].map(
      (item) => document.querySelector(item)?.getAttribute('data-anchor-lines'),
    )
    expect(anchorLines).toStrictEqual(['26-26', '26-26', '26-26'])
  })

  it('opens the card of the decision when Nick clicks its marker and closes it with the close button', async () => {
    await renderAnswered()
    const [marker] = screen.getAllByRole('button', { name: 'Decision d-1' })
    await userEvent.click(marker ?? document.body)
    expect(card('Decision d-1').textContent).toContain("Nick's answer: alternative")
    expect(popupOf('Decision d-1')).toBe(null)
    expect(card('Decision d-1').closest('[data-popup]')?.getAttribute('data-popup')).toBe('true')
    await userEvent.click(screen.getByRole('button', { name: 'Close d-1' }))
    expect(screen.queryByRole('region', { name: 'Decision d-1' })).toBeNull()
  })

  it('closes the full size view of the decision rather than its card when Nick presses Escape', async () => {
    await renderAnswered()
    const lastMarker = screen.getAllByRole('button', { name: 'Decision d-1' }).at(-1)
    await userEvent.click(lastMarker ?? document.body)
    await userEvent.click(screen.getByRole('button', { name: 'Open d-1 at full size' }))
    expect(
      screen.getByRole('dialog', { name: 'Decision: Will the export job retry 8 times?' }),
    ).toBeDefined()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(card('Decision d-1').id).toBe('d-1')
  })

  it('ignores a click on the marker of a decision while Nick writes a new thread', async () => {
    await renderAnswered()
    selectInBlock('3-4', 4, 14)
    await userEvent.click(screen.getByRole('button', { name: 'Comment' }))
    await userEvent.click(
      screen.getAllByRole('button', { name: 'Decision d-1' })[0] ?? document.body,
    )
    expect(screen.queryByRole('region', { name: 'Decision d-1' })).toBeNull()
  })
})

describe('the markers of a narrow page', () => {
  it('opens the card of a thread below its text when Nick clicks its marker and closes it on a second click', async () => {
    await renderIndex()
    const marker = screen.getByRole('button', { name: 'Comment c-1', expanded: false })
    await userEvent.click(marker)
    expect(marker.getAttribute('aria-expanded')).toBe('true')
    expect([popupOf('Comment c-1'), popupOf('Grammar / tone g-1')]).toStrictEqual(['true', 'false'])
    await userEvent.click(marker)
    expect(popupOf('Comment c-1')).toBe('false')
  })

  it('shows the count of messages on the marker of a comment with a reply', async () => {
    await renderIndex()
    expect(screen.getByRole('button', { name: 'Comment c-1' }).textContent).toBe('2')
  })

  it('closes the open card when Nick presses Escape or puts the pointer down outside the card', async () => {
    await renderIndex()
    await userEvent.click(screen.getByRole('button', { name: 'Comment c-1' }))
    await userEvent.keyboard('{Escape}')
    expect(popupOf('Comment c-1')).toBe('false')
    await userEvent.click(screen.getByRole('button', { name: 'Comment c-1' }))
    await userEvent.click(within(card('Comment c-1')).getByText('The agent replied'))
    expect(popupOf('Comment c-1')).toBe('true')
    fireEvent.pointerDown(screen.getByRole('heading', { level: 1 }))
    expect(popupOf('Comment c-1')).toBe('false')
  })

  it('ignores a click on a marker while Nick writes a new thread', async () => {
    await renderIndex()
    selectInBlock('3-4', 4, 14)
    await userEvent.click(screen.getByRole('button', { name: 'Comment' }))
    await userEvent.click(screen.getByRole('button', { name: 'Comment c-1' }))
    await userEvent.keyboard('{Escape}')
    expect(popupOf('Comment c-1')).toBe('false')
  })

  it('opens the draft rather than the active card while Nick writes a new thread', async () => {
    await renderIndex()
    await userEvent.click(screen.getByRole('button', { name: 'Comment c-1' }))
    selectInBlock('3-4', 4, 14)
    await userEvent.click(screen.getByRole('button', { name: 'Comment' }))
    const draft = screen.getByRole('textbox', { name: 'Write a comment…' }).closest('[data-popup]')
    expect([draft?.getAttribute('data-popup'), popupOf('Comment c-1')]).toStrictEqual([
      'true',
      'false',
    ])
  })
})

describe('Nick’s Inbox in the top bar', () => {
  it('counts the items that wait for Nick and goes to the card of the item that Nick chooses', async () => {
    await renderIndex()
    // The subtask that is assigned to Nick waits for him too.
    const inbox = screen.getByRole('button', { name: 'Inbox: 3 items wait for you' })
    await userEvent.click(inbox)
    await userEvent.click(screen.getByRole('menuitem', { name: /The agent replied/ }))
    expect(window.location.hash).toBe('#c-1')
    await waitFor(() => expect(document.activeElement).toBe(card('Comment c-1')))
    expect(popupOf('Comment c-1')).toBe('true')
  })

  it('opens the card of the thread that Nick chooses even when the card can’t receive the focus', async () => {
    vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(() => undefined)
    await renderIndex()
    expect(popupOf('Comment c-1')).toBe('false')
    await userEvent.click(screen.getByRole('button', { name: /^Inbox/ }))
    await userEvent.click(screen.getByRole('menuitem', { name: /The agent replied/ }))
    expect(popupOf('Comment c-1')).toBe('true')
  })

  it('goes to the decision block when Nick chooses a decision', async () => {
    await renderIndex()
    await userEvent.click(screen.getByRole('button', { name: /^Inbox/ }))
    await userEvent.click(screen.getByRole('menuitem', { name: /A decision to make/ }))
    await waitFor(() =>
      expect(document.activeElement?.getAttribute('data-scrolled-into-view')).toBe('true'),
    )
    expect(document.activeElement?.id).toBe('d-1')
  })
})

describe('withPostedThreads', () => {
  const posted = new Map([['c-1', { ...retryQuestion, waitsFor: 'nobody' as const }]])

  it('shows the thread that Nick posted while the thread from the server is behind', () => {
    expect(withPostedThreads([retryQuestion], posted)[0]?.waitsFor).toBe('nobody')
  })

  it('shows the thread from the server once it has caught up', () => {
    const later: Thread = {
      ...retryQuestion,
      messages: [
        ...retryQuestion.messages,
        { author: 'agent', text: 'Done.', time: '2026-11-20T21:40:00.000Z' },
      ],
    }
    expect(withPostedThreads([later], posted)).toStrictEqual([later])
  })
})

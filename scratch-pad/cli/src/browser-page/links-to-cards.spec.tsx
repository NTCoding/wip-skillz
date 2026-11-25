import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type Thread } from './api-responses'
import {
  exportPad,
  exportPadAddresses,
  fakeConnection,
  fakeNarrowWindow,
  indexPage,
  retryQuestion,
} from './browser-page-fixtures'
import { queuedComment } from './outbox-fixtures'
import { ScratchPadApp } from './scratch-pad-app'

// Nick has picked an option for the decision d-1 so its card is shown in the margin. A thread and
// a comment in the outbox are on the text of the decision. That's why their cards are beside the
// question too.
async function renderDecidedDecisionAt(path: string): Promise<void> {
  const fake = fakeConnection()
  fake.pages.set('index.md', {
    ...indexPage,
    decisions: [
      {
        id: 'd-1',
        question: 'Will the export job retry 8 times?',
        answer: { choice: 'proposal' },
        reviews: [],
        options: undefined,
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
  await screen.findByRole('region', { name: 'Comment c-1' })
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

describe('a link to a card in the margin', () => {
  // The agent's tool prints a link like #d-1. The page scrolls in the commit that shows the card.
  // The card has to be beside its question by then rather than at the top of the margin.
  it.each(['d-1', 'c-2', 'outbox-1'])(
    'places the card of %s in the margin before the page scrolls to the card when Nick opens a link to it',
    async (id) => {
      const scrolled: { readonly id: string; readonly placed: boolean | undefined }[] = []
      vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(function scrollIntoView(
        this: Element,
      ) {
        const item = this.closest('[data-key]')
        scrolled.push({ id: this.id, placed: item?.hasAttribute('data-placed') })
      })
      await renderDecidedDecisionAt(`/${exportPad}/#${id}`)
      await waitFor(() => expect(scrolled).toStrictEqual([{ id, placed: true }]))
    },
  )
})

// The agent has deleted queue.md. The thread c-4 waits for Nick and the comment outbox-3 is in the
// outbox. That's why MissingPageView shows both cards. The Inbox is loaded after the threads and
// the outbox.
async function renderDeletedPageAt(path: string): Promise<void> {
  const fake = fakeConnection()
  const loadInbox = Promise.withResolvers<void>()
  vi.spyOn(fake.connection, 'nickInbox').mockImplementation(async () => {
    await loadInbox.promise
    return { threads: [{ ...retryQuestion, id: 'c-4', page: 'pages/queue.md' }], decisions: [] }
  })
  fake.outbox.push({ ...queuedComment, number: 3, page: 'pages/queue.md' })
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
  await screen.findByRole('region', { name: 'Comment in the outbox' })
  loadInbox.resolve()
  await screen.findByRole('region', { name: 'Comment c-4' })
}

describe('a link to a card on a deleted page', () => {
  it.each(['c-4', 'outbox-3'])(
    'scrolls to the card of %s once the Inbox is loaded when Nick opens a link to it',
    async (id) => {
      await renderDeletedPageAt(`/${exportPad}/queue.md#${id}`)
      await waitFor(() =>
        expect(document.getElementById(id)?.getAttribute('data-scrolled-into-view')).toBe('true'),
      )
      expect(window.scrollTo).not.toHaveBeenCalled()
    },
  )
})

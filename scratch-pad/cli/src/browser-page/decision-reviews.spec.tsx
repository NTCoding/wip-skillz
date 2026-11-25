import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowserPageError } from './browser-page-error'
import {
  exportPad,
  exportPadAddresses,
  fakeConnection,
  fakeNarrowWindow,
  indexPage,
  type FakeConnection,
} from './browser-page-fixtures'
import { ScratchPadApp } from './scratch-pad-app'
import { type ViewedPage } from './api-responses'

function renderApp(path: string, fake: FakeConnection = fakeConnection()) {
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
  return fake
}

type Review = ViewedPage['decisions'][number]['reviews'][number]

function fakeWithReview(...reviews: Review[]): FakeConnection {
  const fake = fakeConnection()
  fake.pages.set('index.md', {
    ...indexPage,
    decisions: [
      {
        id: 'd-1',
        question: 'Will the export job retry 8 times?',
        answer: undefined,
        reviews,
        options: undefined,
      },
    ],
  })
  return fake
}

const decisionCard = () => screen.findByRole('region', { name: 'Decision d-1' })

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

describe('a decision that Nick asks the agent to change', () => {
  it('requests changes with the reason and reads the page again', async () => {
    const fake = renderApp(`/${exportPad}/`)
    const card = await decisionCard()
    const pageRead = vi.spyOn(fake.connection, 'page')

    await userEvent.click(within(card).getByRole('button', { name: 'Request changes' }))
    await userEvent.type(
      within(card).getByRole('textbox', { name: 'What has to change on the page?' }),
      'Who is the team?{Enter}',
    )

    expect(fake.connection.requestDecisionChanges).toHaveBeenCalledWith(
      'd-1',
      'pages/index.md',
      'Who is the team?',
    )
    await waitFor(() => expect(pageRead).toHaveBeenCalledWith(expect.any(String)))
  })

  it('shows the reason and no buttons on a decision with changes requested', async () => {
    renderApp(
      `/${exportPad}/`,
      fakeWithReview({
        id: 'd-1',
        page: 'pages/index.md',
        line: 28,
        question: 'Will the export job retry 8 times?',
        round: 1,
        reason: 'Who is the team?',
        outcome: undefined,
        time: '2026-11-21T11:00:00.000Z',
      }),
    )
    const card = await decisionCard()

    expect(card.textContent).toContain('Nick requested changes: Who is the team?')
    expect(within(card).queryByRole('button', { name: 'Proposal' })).toBeNull()
  })

  it('shows the buttons again and the line of the agent on a decision that the agent has reopened', async () => {
    renderApp(
      `/${exportPad}/`,
      fakeWithReview({
        id: 'd-1',
        page: 'pages/index.md',
        line: 28,
        question: 'Will the export job retry 8 times?',
        round: 1,
        reason: 'Who is the team?',
        outcome: 'Added who the team is.',
        time: '2026-11-21T11:00:00.000Z',
      }),
    )
    const card = await decisionCard()

    expect(card.textContent).toContain('The agent changed the page: Added who the team is.')
    expect(within(card).getByRole('button', { name: 'Proposal' })).toBeDefined()
    expect(within(card).getByRole('button', { name: 'Request changes' })).toBeDefined()
  })
})

describe('the Decisions page while it loads', () => {
  it('shows Decisions in the breadcrumb when Nick opens the decisions', async () => {
    renderApp(`/${exportPad}/decisions`)
    await screen.findByRole('heading', { level: 1, name: 'Decisions' })
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' }).textContent).toBe(
      'Invoice export/Decisions',
    )
  })

  it('shows loading until the decisions are read', async () => {
    const fake = fakeConnection()
    vi.spyOn(fake.connection, 'decisions').mockReturnValue(new Promise(() => undefined))
    renderApp(`/${exportPad}/decisions`, fake)

    expect((await screen.findByRole('status')).textContent).toBe('Loading…')
  })

  it('shows the problem when the decisions can’t be read', async () => {
    const fake = fakeConnection()
    vi.spyOn(fake.connection, 'decisions').mockRejectedValue(
      new BrowserPageError('The server is down.'),
    )
    renderApp(`/${exportPad}/decisions`, fake)

    expect((await screen.findByText('The server is down.')).textContent).toBe('The server is down.')
  })

  it('shows the filter buttons once the decisions and the log are read', async () => {
    renderApp(`/${exportPad}/decisions`)

    expect(await screen.findByRole('group', { name: 'Show' }, { timeout: 2000 })).toBeDefined()
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { type ViewedPage } from './api-responses'
import { exportPad, exportPadAddresses, indexPage } from './browser-page-fixtures'
import { pageElements, parsedPageBody } from './page-elements'

const decisionWithContext: ViewedPage = {
  ...indexPage,
  html: [
    '<div class="decision" data-decision="d-2" data-lines="1-7">',
    '<div class="decision-context"><p class="decision-label">Context</p><p>A slow network can make an upload fail.</p>',
    '<ol>',
    '<li><a href="retry-limit.md">The retry limit</a> explains the limit.</li>',
    '<li>The log shows the failures.</li>',
    '</ol>',
    '</div>',
    '<div class="decision-proposal"><p class="decision-label">Proposal</p><p>Raise it.</p></div>',
    '</div>',
  ].join('\n'),
  links: [
    { kind: 'page', href: 'retry-limit.md', page: 'pages/retry-limit.md', headingId: undefined },
  ],
  decisions: [
    {
      id: 'd-2',
      question: 'Will the job retry 8 times?',
      answer: undefined,
      reviews: [],
      options: undefined,
    },
  ],
}

describe('the context of a decision on the page', () => {
  it('shows the context under its label above the fields, with its numbered list and a link that opens the page', async () => {
    const onNavigate = vi.fn<(href: string) => void>()
    const context = {
      addresses: exportPadAddresses,
      page: decisionWithContext,
      onNavigate,
      loadPreview: () => Promise.resolve(undefined),
      findTask: () => undefined,
      onAnswerDecision: () => Promise.resolve(),
      onRequestDecisionChanges: undefined,
      onCommentOnBlock: () => undefined,
      answersOnThisPage: new Map(),
    }
    render(
      <article>
        {pageElements(context, parsedPageBody(decisionWithContext.html), new Map())}
      </article>,
    )

    const card = screen.getByRole('region', { name: 'Decision d-2' })
    expect(card.querySelector('.decision-card__context')?.textContent).toBe(
      'ContextA slow network can make an upload fail.The retry limit explains the limit.The log shows the failures.',
    )
    await userEvent.click(screen.getByRole('link', { name: 'The retry limit' }))
    expect(onNavigate).toHaveBeenCalledWith(`/${exportPad}/retry-limit.md`)
  })
})

import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { type ViewedPage } from './api-responses'
import { answeredDecisions, parsedPageBody, type PageElementContext } from './page-elements'
import { contextFor, renderPage, withHtml } from './page-elements-fixtures'

const html = [
  '<h1 id="how-long" data-lines="4-4">How long should a retry wait?</h1>',
  '<p class="decision-page-status" data-decision="d-4"></p>',
  '<nav class="decision-page-contents"><ul><li><a href="#context">Context</a></li><li><a href="#options">Options</a><ul><li><a href="#option-1">Option 1: Wait 30 seconds</a></li></ul></li><li><a href="#decision">Decision</a></li></ul></nav>',
  '<h2 id="context" data-lines="7-7">Context</h2>',
  '<p data-lines="8-8">A shop with a slow network fails an upload.</p>',
  '<h2 id="decision">Decision</h2>',
  '<div class="decision decision-page-decision" data-decision="d-4">',
  '<p class="decision-option" data-choice="option-1">Option 1: Wait 30 seconds</p>',
  '<p class="decision-option" data-choice="option-2">Option 2: Double the wait</p>',
  '<p class="decision-option" data-choice="option-3">Option 3: Stop retrying</p>',
  '</div>',
].join('')

const options = [
  { choice: 'option-1', label: 'Option 1: Wait 30 seconds' },
  { choice: 'option-2', label: 'Option 2: Double the wait' },
  { choice: 'option-3', label: 'Option 3: Stop retrying' },
]

type Decision = ViewedPage['decisions'][number]

function pageWith(changes: Partial<Decision> = {}): ViewedPage {
  return {
    ...withHtml(html),
    links: [
      { kind: 'page', href: '#context', page: 'pages/index.md', headingId: 'context' },
      { kind: 'page', href: '#decision', page: 'pages/index.md', headingId: 'decision' },
    ],
    decisions: [
      {
        id: 'd-4',
        question: 'How long should a retry wait?',
        answer: undefined,
        reviews: [],
        options,
        ...changes,
      },
    ],
  }
}

const waitingRound = { reason: 'Show the cost.', outcome: undefined }
const closedRound = { reason: 'Show the cost.', outcome: 'Added the cost.' }

function round(changes: { reason: string; outcome: string | undefined }) {
  return {
    id: 'd-4',
    page: 'pages/index.md',
    line: 4,
    question: 'How long should a retry wait?',
    round: 1,
    time: '2026-03-14T09:30:00.000Z',
    ...changes,
  }
}

function card() {
  return screen.getByRole('region', { name: 'Decision d-4' })
}

describe('a decision page in the browser', () => {
  it('shows the status under the title and the table of contents as links to the headings', () => {
    renderPage(pageWith())

    expect(screen.getByText('Open').closest('p')?.textContent).toBe('Status: Open')
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toStrictEqual([
      'Context',
      'Options',
      'Option 1: Wait 30 seconds',
      'Decision',
    ])
    expect(
      screen
        .getAllByRole('link')
        .map((link) => link.closest('.table-of-contents__entry')?.getAttribute('data-level')),
    ).toStrictEqual(['2', '2', '3', '2'])
  })

  it('shows the status Draft without a Decision section or a button on a draft page', () => {
    const draft = [
      '<h1 id="how-long" data-lines="4-4">How long should a retry wait?</h1>',
      '<p class="decision-page-status" data-decision="d-4" data-state="draft"></p>',
      '<p data-lines="5-5">The description.</p>',
    ].join('')
    renderPage({ ...withHtml(draft), decisions: [] })

    expect(screen.getByText('Draft', { selector: 'strong' }).closest('p')?.textContent).toBe(
      'Status: Draft',
    )
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('region')).toBeNull()
  })

  it('shows a button for each option and sends the choice when Nick presses an option', async () => {
    const onAnswerDecision = vi.fn<NonNullable<PageElementContext['onAnswerDecision']>>(() =>
      Promise.resolve(),
    )
    renderPage(pageWith(), { onAnswerDecision })

    expect(
      within(screen.getByRole('group', { name: 'Answer the decision' }))
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toStrictEqual(options.map((option) => option.label))
    await userEvent.click(screen.getByRole('button', { name: 'Option 3: Stop retrying' }))

    expect(onAnswerDecision).toHaveBeenCalledWith('d-4', { choice: 'option-3' })
  })

  it('doesn’t show the proposal, the alternative or the pick of an inline block', () => {
    renderPage(pageWith())

    expect(card().querySelectorAll('dt')).toHaveLength(0)
  })

  it('has a field for Nick’s own text and the button that requests changes', () => {
    renderPage(pageWith(), { onRequestDecisionChanges: () => Promise.resolve() })

    expect(screen.getByRole('textbox', { name: 'Answer in your own words…' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Request changes' })).toBeDefined()
  })

  it('shows the label of the option that Nick chose and the status Decided', () => {
    renderPage(pageWith({ answer: { choice: 'option-2' } }))

    expect(screen.getByText('Decided').closest('p')?.textContent).toBe('Status: Decided')
    expect(card().textContent).toContain("Nick's answer: Option 2: Double the wait")
    expect(screen.queryByRole('button', { name: 'Option 1: Wait 30 seconds' })).toBeNull()
  })

  it('shows the text that Nick wrote when he decided in his own words', () => {
    renderPage(pageWith({ answer: { written: 'Wait 1 minute.' } }))

    expect(card().textContent).toContain("Nick's answer: Wait 1 minute.")
  })

  it('shows the choice of an option that the page doesn’t list as it was sent', () => {
    renderPage(pageWith({ options: undefined }), {
      answersOnThisPage: new Map([['d-4', { choice: 'option-9' }]]),
    })

    expect(card().textContent).toContain("Nick's answer: option-9")
  })

  it('shows the status Changes requested and the reason when the agent has to change the page', () => {
    renderPage(pageWith({ reviews: [round(waitingRound)] }))

    expect(screen.getByText('Changes requested', { selector: 'strong' })).toBeDefined()
    expect(card().textContent).toContain('Nick requested changes: Show the cost.')
    expect(screen.queryByRole('button', { name: 'Option 1: Wait 30 seconds' })).toBeNull()
  })

  it('shows the buttons again and the status Open when the agent has reopened the decision', () => {
    renderPage(pageWith({ reviews: [round(closedRound)] }))

    expect(screen.getByText('Open', { selector: 'strong' })).toBeDefined()
    expect(card().textContent).toContain('The agent changed the page: Added the cost.')
    expect(screen.getByRole('button', { name: 'Option 1: Wait 30 seconds' })).toBeDefined()
  })

  it('shows the page without any button when the page is read only', () => {
    renderPage(pageWith(), { onAnswerDecision: undefined })

    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('Open', { selector: 'strong' })).toBeDefined()
  })

  it('keeps the Decision section in the text and never moves it to the margin', () => {
    const context = contextFor(pageWith({ answer: { choice: 'option-1' } }))

    expect(answeredDecisions(context, parsedPageBody(html))).toStrictEqual([])
  })
})

import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { answeredDecisions, parsedPageBody } from './page-elements'
import { answeredDecision, contextFor, renderPage, withHtml } from './page-elements-fixtures'

describe('answeredDecisions', () => {
  it('returns the question, the lines, the fields, the answer and the paragraphs under the question of each answered decision', () => {
    const html = [
      '<h2 data-lines="1-1">Will the export job retry 8 times?</h2>',
      '<p data-lines="3-3">The network of a shop can be slow.</p>',
      '<p data-lines="5-5"><img src="steps.svg" alt="The 3 steps"></p>',
      '<pre data-lines="7-9"><code>retries = 8</code></pre>',
      '<p data-lines="11-11">The job retries 8 times now.</p>',
      '<div class="decision" data-decision="d-1" data-lines="13-17">',
      '<div class="decision-proposal"><p class="decision-label">Proposal</p><p>Raise it.</p></div>',
      '</div>',
    ].join('')
    const page = {
      ...withHtml(html),
      decisions: [
        answeredDecision('d-1', 'Will the export job retry 8 times?', { choice: 'proposal' }),
      ],
    }
    const [decision] = answeredDecisions(contextFor(page), parsedPageBody(html))
    expect({ ...decision, proposal: undefined }).toStrictEqual({
      id: 'd-1',
      question: 'Will the export job retry 8 times?',
      headingLines: '1-1',
      blockLines: '13-17',
      proposal: undefined,
      alternative: null,
      pick: null,
      answer: 'proposal',
      context: ['The network of a shop can be slow.', 'The job retries 8 times now.'],
    })
  })

  it('doesn’t return the lines of an answered decision when its block doesn’t have any', () => {
    const html =
      '<h2 data-lines="1-1">Who pays the fee?</h2><div class="decision" data-decision="d-1"></div>'
    const page = {
      ...withHtml(html),
      decisions: [answeredDecision('d-1', 'Who pays the fee?', { written: 'The shop.' })],
    }
    const [decision] = answeredDecisions(contextFor(page), parsedPageBody(html))
    expect([decision?.blockLines, decision?.answer]).toStrictEqual([undefined, 'The shop.'])
  })

  it('keeps an answered decision in the text when the decision has a warning or is inside another block', () => {
    const html = [
      '<h2 data-lines="1-1">Who pays the fee?</h2>',
      '<div class="decision" data-decision="d-1">',
      '<p class="named-block-warning">The decision doesn’t have a pick: line.</p>',
      '</div>',
      '<blockquote><h3>Who sends the file?</h3><div class="decision" data-decision="d-2"></div></blockquote>',
    ].join('')
    const page = {
      ...withHtml(html),
      decisions: [
        answeredDecision('d-1', 'Who pays the fee?', { choice: 'proposal' }),
        answeredDecision('d-2', 'Who sends the file?', { choice: 'alternative' }),
      ],
    }
    renderPage(page)
    expect(answeredDecisions(contextFor(page), parsedPageBody(html))).toStrictEqual([])
    expect(
      screen.getAllByRole('region').map((card) => card.getAttribute('aria-label')),
    ).toStrictEqual(['Decision d-1', 'Decision d-2'])
  })
})

import { describe, expect, it } from 'vitest'
import { renderedInvoicePage } from './rendered-page-fixtures'

const taxDecision = [
  '# Invoice template',
  '',
  '## Will the invoice show the tax number?',
  '',
  ':::decision d-3',
  'proposal: Show the **tax number** on every invoice.',
  'alternative: Show the tax number only for companies.',
  'pick: proposal, because',
  '  the law asks for a tax number.',
  ':::',
]

function decisionWith(lines: readonly string[], opening = ':::decision d-3') {
  return renderedInvoicePage([opening, ...lines, ':::'])
}

const completeLines = ['proposal: a', 'alternative: b', 'pick: a']

describe('the :::decision block', () => {
  it('renders the proposal, the alternative, the pick and the buttons when the decision is complete', () => {
    expect(renderedInvoicePage(taxDecision).html.split('\n').slice(2)).toStrictEqual([
      '<div class="decision" data-decision="d-3" data-lines="5-10">',
      '<div class="decision-proposal"><p class="decision-label">Proposal</p><p>Show the <strong>tax number</strong> on every invoice.</p></div>',
      '<div class="decision-alternative"><p class="decision-label">Alternative</p><p>Show the tax number only for companies.</p></div>',
      '<div class="decision-pick"><p class="decision-label">Pick</p><p>proposal, because',
      'the law asks for a tax number.</p></div>',
      '<div class="decision-buttons"><button type="button" data-choice="proposal">Proposal</button><button type="button" data-choice="alternative">Alternative</button><button type="button" data-choice="written">Write an answer</button></div>',
      '</div>',
      '',
    ])
  })

  it('returns the decision with its lines and the heading above it as the question when the decision is complete', () => {
    expect(renderedInvoicePage(taxDecision).decisions).toStrictEqual([
      {
        id: 'd-3',
        firstLine: 5,
        lastLine: 10,
        question: 'Will the invoice show the tax number?',
        proposal: 'Show the **tax number** on every invoice.',
        alternative: 'Show the tax number only for companies.',
        pick: 'proposal, because\nthe law asks for a tax number.',
      },
    ])
  })

  it("returns the decision without a question when there aren't any headings above the decision", () => {
    expect(
      decisionWith(completeLines).decisions.map((decision) => decision.question),
    ).toStrictEqual([undefined])
  })

  it("renders the decision without buttons when the decision doesn't have an id", () => {
    const page = decisionWith(completeLines, ':::decision')

    expect(page.problems).toStrictEqual([
      { line: 1, text: "the decision doesn't have an id (write :::decision d-1)" },
    ])
    expect(page.decisions).toStrictEqual([])
    expect(page.html).not.toContain('<button')
  })

  it("reports the id when the id isn't a decision id", () => {
    expect(decisionWith(completeLines, ':::decision c-3').problems).toStrictEqual([
      { line: 1, text: '"c-3" isn\'t a decision id. A decision id looks like d-1' },
    ])
  })

  it('reports each missing line when the decision only has a proposal', () => {
    expect(decisionWith(['proposal: Show the tax number.']).problems).toStrictEqual([
      { line: 1, text: "decision d-3 doesn't have the alternative: line" },
      { line: 1, text: "decision d-3 doesn't have the pick: line" },
    ])
  })

  it('reports the second proposal line and uses the first when a decision has 2 proposal lines', () => {
    const page = decisionWith([
      'proposal: Show the tax number.',
      'proposal: Hide the tax number.',
      'alternative: b',
      'pick: a',
    ])

    expect(page.problems).toStrictEqual([
      { line: 3, text: 'decision d-3 has a second proposal: line' },
    ])
    expect(page.decisions.map((decision) => decision.proposal)).toStrictEqual([
      'Show the tax number.',
    ])
  })

  it('reports a line before the proposal when the line starts with another word', () => {
    expect(
      decisionWith(['', 'Should we?', 'proposal: a', '', 'alternative: b', 'pick: a']).problems,
    ).toStrictEqual([
      { line: 3, text: "the line doesn't start with proposal:, alternative: or pick:" },
    ])
  })
})

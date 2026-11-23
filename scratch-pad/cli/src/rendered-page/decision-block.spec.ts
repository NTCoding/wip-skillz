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

const taxQuestion = '## Will the invoice show the tax number?'

function decisionWith(lines: readonly string[], opening = ':::decision d-3') {
  return renderedInvoicePage([taxQuestion, '', opening, ...lines, ':::'])
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
        context: undefined,
        proposal: 'Show the **tax number** on every invoice.',
        alternative: 'Show the tax number only for companies.',
        pick: 'proposal, because\nthe law asks for a tax number.',
      },
    ])
  })

  it("returns the decision without a question when there aren't any headings above the decision", () => {
    expect(
      renderedInvoicePage([':::decision d-3', ...completeLines, ':::']).decisions.map(
        (decision) => decision.question,
      ),
    ).toStrictEqual([undefined])
  })

  it("reports the decision when there aren't any headings above the decision", () => {
    expect(
      renderedInvoicePage(['Intro', '', ':::decision d-3', ...completeLines, ':::']).problems,
    ).toStrictEqual([
      {
        line: 3,
        text: "decision d-3 doesn't have a heading above it (write the question as a heading)",
      },
    ])
  })

  it("renders the decision without buttons when the decision doesn't have an id", () => {
    const page = decisionWith(completeLines, ':::decision')

    expect(page.problems).toStrictEqual([
      { line: 3, text: "the decision doesn't have an id (write :::decision d-1)" },
    ])
    expect(page.decisions).toStrictEqual([])
    expect(page.html).not.toContain('<button')
  })

  it("reports the id when the id isn't a decision id", () => {
    expect(decisionWith(completeLines, ':::decision c-3').problems).toStrictEqual([
      { line: 3, text: '"c-3" isn\'t a decision id. A decision id looks like d-1' },
    ])
  })

  it('reports each missing line when the decision only has a proposal', () => {
    expect(decisionWith(['proposal: Show the tax number.']).problems).toStrictEqual([
      { line: 3, text: "decision d-3 doesn't have the alternative: line" },
      { line: 3, text: "decision d-3 doesn't have the pick: line" },
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
      { line: 5, text: 'decision d-3 has a second proposal: line' },
    ])
    expect(page.decisions.map((decision) => decision.proposal)).toStrictEqual([
      'Show the tax number.',
    ])
  })

  it('reports a line before the proposal when the line starts with another word', () => {
    expect(
      decisionWith(['', 'Should we?', 'proposal: a', '', 'alternative: b', 'pick: a']).problems,
    ).toStrictEqual([
      {
        line: 5,
        text: "the line doesn't start with context:, proposal:, alternative: or pick:",
      },
    ])
  })

  it('renders the context with its paragraph and its numbered list above the proposal and returns the text of the context', () => {
    const page = decisionWith([
      'context: A slow network in the evening can make an upload fail. Read these in order:',
      '  1. [How the job runs](how-the-job-runs.md) shows where the upload happens.',
      '  2. [The retry limit](retry-limit.md) explains why the limit is 5 today.',
      ...completeLines,
    ])

    expect(page.problems).toStrictEqual([])
    expect(page.html.split('\n').slice(1, 9)).toStrictEqual([
      '<div class="decision" data-decision="d-3" data-lines="3-10">',
      '<div class="decision-context"><p class="decision-label">Context</p><p>A slow network in the evening can make an upload fail. Read these in order:</p>',
      '<ol>',
      '<li><a href="how-the-job-runs.md">How the job runs</a> shows where the upload happens.</li>',
      '<li><a href="retry-limit.md">The retry limit</a> explains why the limit is 5 today.</li>',
      '</ol>',
      '</div>',
      '<div class="decision-proposal"><p class="decision-label">Proposal</p><p>a</p></div>',
    ])
    expect(page.decisions.map((decision) => decision.context)).toStrictEqual([
      [
        'A slow network in the evening can make an upload fail. Read these in order:',
        '1. [How the job runs](how-the-job-runs.md) shows where the upload happens.',
        '2. [The retry limit](retry-limit.md) explains why the limit is 5 today.',
      ].join('\n'),
    ])
  })

  it('renders the decision without a Context label and returns an undefined context when the context: line is empty', () => {
    const page = decisionWith(['context:', ...completeLines])

    expect(page.html).not.toContain('decision-context')
    expect(page.decisions.map((decision) => decision.context)).toStrictEqual([undefined])
  })

  it('returns the links in the context of the decision with their lines as links of the page', () => {
    const page = decisionWith([
      'context: Read these in order:',
      '  1. [The retry limit](retry-limit.md#limit) explains the limit.',
      ...completeLines,
    ])

    expect(page.links).toStrictEqual([
      {
        kind: 'page',
        line: 5,
        href: 'retry-limit.md#limit',
        page: 'pages/retry-limit.md',
        headingId: 'limit',
      },
    ])
  })
})

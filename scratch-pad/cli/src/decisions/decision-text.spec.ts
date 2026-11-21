import { describe, expect, it } from 'vitest'
import { exportJobAddress, servedLinks, unservedLinks } from '../item-links/item-links-fixtures'
import { aDecisionAnswer } from './decision-answer-fixtures'
import { decisionInboxLines, decisionShowLines } from './decision-text'

describe('decisionInboxLines', () => {
  it('prints the id, the page line, the question, the link and the answer', () => {
    expect(decisionInboxLines(aDecisionAnswer({}), 'pages/index.md', servedLinks)).toStrictEqual([
      '[d-1] decision · pages/index.md:9 · "Will the invoice template show the tax number?"',
      `  link: ${exportJobAddress}#d-1`,
      '  Nick chose: proposal',
    ])
  })

  it('prints the file with its number and a link without the number when the file name of the page has a number', () => {
    const decision = aDecisionAnswer({ page: 'pages/tax-number.md' })

    expect(decisionInboxLines(decision, 'pages/2-tax-number.md', servedLinks)).toStrictEqual([
      '[d-1] decision · pages/2-tax-number.md:9 · "Will the invoice template show the tax number?"',
      `  link: ${exportJobAddress}tax-number.md#d-1`,
      '  Nick chose: proposal',
    ])
  })

  it("leaves out the link when the server isn't running", () => {
    expect(decisionInboxLines(aDecisionAnswer({}), 'pages/index.md', unservedLinks)).toStrictEqual([
      '[d-1] decision · pages/index.md:9 · "Will the invoice template show the tax number?"',
      '  Nick chose: proposal',
    ])
  })
})

describe('decisionShowLines', () => {
  it('prints waits for the agent when the agent has not followed the answer', () => {
    expect(decisionShowLines(aDecisionAnswer({}), 'pages/index.md', servedLinks)[0]).toBe(
      '[d-1] decision · pages/index.md:9 · "Will the invoice template show the tax number?" · waits for the agent',
    )
  })

  it('prints done and the outcome when the agent has followed the answer', () => {
    expect(
      decisionShowLines(
        aDecisionAnswer({ outcome: 'Showed the tax number.' }),
        'pages/index.md',
        servedLinks,
      ),
    ).toStrictEqual([
      '[d-1] decision · pages/index.md:9 · "Will the invoice template show the tax number?" · done',
      `  link: ${exportJobAddress}#d-1`,
      '  Nick chose: proposal',
      '  outcome: Showed the tax number.',
    ])
  })
})

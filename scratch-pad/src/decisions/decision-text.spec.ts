import { describe, expect, it } from 'vitest'
import { aDecisionAnswer } from './decision-answer-fixtures'
import { decisionInboxLines, decisionShowLines } from './decision-text'

describe('decisionInboxLines', () => {
  it('prints the id, the page line, the question and the answer', () => {
    expect(decisionInboxLines(aDecisionAnswer({}))).toStrictEqual([
      '[d-1] decision · pages/index.md:9 · "Will the invoice template show the tax number?"',
      '  Nick chose: proposal',
    ])
  })
})

describe('decisionShowLines', () => {
  it('prints waits for the agent when the agent has not followed the answer', () => {
    expect(decisionShowLines(aDecisionAnswer({}))[0]).toBe(
      '[d-1] decision · pages/index.md:9 · "Will the invoice template show the tax number?" · waits for the agent',
    )
  })

  it('prints done and the outcome when the agent has followed the answer', () => {
    expect(decisionShowLines(aDecisionAnswer({ outcome: 'Showed the tax number.' }))).toStrictEqual(
      [
        '[d-1] decision · pages/index.md:9 · "Will the invoice template show the tax number?" · done',
        '  Nick chose: proposal',
        '  outcome: Showed the tax number.',
      ],
    )
  })
})

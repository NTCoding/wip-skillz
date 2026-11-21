import { type DecisionAnswer } from './decision-answer'

export function aDecisionAnswer(changes: Partial<DecisionAnswer>): DecisionAnswer {
  return {
    id: 'd-1',
    page: 'pages/index.md',
    line: 9,
    question: 'Will the invoice template show the tax number?',
    answer: { choice: 'proposal' },
    outcome: undefined,
    time: '2026-03-14T09:30:00.000Z',
    ...changes,
  }
}

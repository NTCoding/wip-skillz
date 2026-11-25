import { type DecisionReview } from './decision-review'

export function aDecisionReview(changes: Partial<DecisionReview>): DecisionReview {
  return {
    id: 'd-1',
    page: 'pages/index.md',
    line: 9,
    question: 'Will the invoice template show the tax number?',
    round: 1,
    reason: "The options don't say who the team is.",
    outcome: undefined,
    time: '2026-03-14T09:30:00.000Z',
    ...changes,
  }
}

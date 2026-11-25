import { type DecisionsOfPad } from './api-responses'

// The open decision is d-1 on the index page. The review of d-2 is a decision that Nick has asked
// the agent to change.
export const decisionsOfPad: DecisionsOfPad = {
  open: [
    {
      page: 'pages/index.md',
      id: 'd-1',
      line: 28,
      question: 'Will the export job retry 8 times?',
      time: '2026-11-20T21:05:00.000Z',
      context: undefined,
    },
  ],
  reviews: [
    {
      id: 'd-2',
      page: 'pages/invoice-template.md',
      line: 12,
      question: 'Will the invoice show the tax number?',
      round: 1,
      reason: "The options don't say who the team is.",
      outcome: undefined,
      time: '2026-11-21T10:00:00.000Z',
    },
  ],
}

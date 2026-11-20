import { ScratchPadError } from '../scratch-pad-error'

export type Answer = { readonly choice: string } | { readonly written: string }

export interface DecisionAnswer {
  readonly id: string
  readonly page: string
  readonly line: number
  readonly question: string
  readonly answer: Answer
  readonly seenByAgent: boolean
  readonly time: string
}

export interface NewDecisionAnswer {
  readonly page: string
  readonly line: number
  readonly question: string
  readonly answer: Answer
}

export class EmptyAnswerError extends ScratchPadError {
  constructor() {
    super('The answer is empty. Pick an option or write an answer.')
  }
}

export function answerDecision(id: string, input: NewDecisionAnswer, time: string): DecisionAnswer {
  if (answerWords(input.answer).trim() === '') {
    throw new EmptyAnswerError()
  }
  return {
    id,
    page: input.page,
    line: input.line,
    question: input.question,
    answer: input.answer,
    seenByAgent: false,
    time,
  }
}

export function markSeenByAgent(decision: DecisionAnswer): DecisionAnswer {
  return { ...decision, seenByAgent: true }
}

export function answerLine(answer: Answer): string {
  return 'choice' in answer ? `Nick chose: ${answer.choice}` : `Nick wrote: ${answer.written}`
}

function answerWords(answer: Answer): string {
  return 'choice' in answer ? answer.choice : answer.written
}

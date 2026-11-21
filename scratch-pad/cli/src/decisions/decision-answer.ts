import { InvalidDecisionIdError, isDecisionId } from '../items/item-id'
import { ScratchPadError } from '../scratch-pad-error'
import { EmptyOutcomeError } from '../threads/thread'

export type Answer = { readonly choice: string } | { readonly written: string }

export interface DecisionAnswer {
  readonly id: string
  readonly page: string
  readonly line: number
  readonly question: string
  readonly answer: Answer
  readonly outcome: string | undefined
  readonly time: string
}

export interface NewDecisionAnswer {
  readonly id: string
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

export function answerDecision(input: NewDecisionAnswer, time: string): DecisionAnswer {
  if (!isDecisionId(input.id)) {
    throw new InvalidDecisionIdError(input.id)
  }
  if (answerWords(input.answer).trim() === '') {
    throw new EmptyAnswerError()
  }
  return {
    id: input.id,
    page: input.page,
    line: input.line,
    question: input.question,
    answer: input.answer,
    outcome: undefined,
    time,
  }
}

export function followDecision(decision: DecisionAnswer, outcome: string): DecisionAnswer {
  const line = outcome.trim()
  if (line === '') {
    throw new EmptyOutcomeError()
  }
  return { ...decision, outcome: line }
}

export function answerLine(answer: Answer): string {
  return 'choice' in answer ? `Nick chose: ${answer.choice}` : `Nick wrote: ${answer.written}`
}

export function loggedAnswerLine(answer: Answer, chosenOption: string | undefined): string {
  return 'choice' in answer && chosenOption !== undefined
    ? `Nick chose the ${answer.choice}: ${chosenOption}`
    : answerLine(answer)
}

function answerWords(answer: Answer): string {
  return 'choice' in answer ? answer.choice : answer.written
}

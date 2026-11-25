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

// The label is the heading of the option that Nick chose on a decision page
export function answerLine(answer: Answer, optionLabel?: string): string {
  return 'choice' in answer
    ? `Nick chose: ${optionLabel ?? answer.choice}`
    : `Nick wrote: ${answer.written}`
}

// An inline block has a proposal and an alternative, so the line has the choice and the text of
// the option. The label of an option on a decision page is its heading, which is written once.
export function loggedAnswerLine(answer: Answer, chosenOption: string | undefined): string {
  if (!('choice' in answer) || chosenOption === undefined) {
    return answerLine(answer)
  }
  return answer.choice.startsWith('option-')
    ? answerLine(answer, chosenOption)
    : `Nick chose the ${answer.choice}: ${chosenOption}`
}

function answerWords(answer: Answer): string {
  return 'choice' in answer ? answer.choice : answer.written
}

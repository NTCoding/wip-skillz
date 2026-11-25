import { InvalidDecisionIdError, isDecisionId } from '../items/item-id'
import { ScratchPadError } from '../scratch-pad-error'
import { EmptyOutcomeError } from '../threads/thread'

// Nick can ask the agent to change the content around a decision or its wording instead of
// choosing an option. Each request is a round. A round waits for the agent until the agent changes
// the page and reopens the decision. The command `reopen` stores the line that the agent wrote as
// the outcome of the round. A reopened decision is open again. Nick can then choose an option or
// ask for another round. Every round stays as history. The rounds of a decision are numbered from 1.
export interface DecisionReview {
  readonly id: string
  readonly page: string
  readonly line: number
  readonly question: string
  readonly round: number
  readonly reason: string
  // The line that the agent wrote with `reopen`. A round without an outcome waits for the agent.
  readonly outcome: string | undefined
  readonly time: string
}

export interface NewDecisionReview {
  readonly id: string
  readonly page: string
  readonly line: number
  readonly question: string
  readonly reason: string
}

export class EmptyReasonError extends ScratchPadError {
  constructor() {
    super('The reason is empty. Write what has to change.')
  }
}

export class DecisionAlreadyAnsweredError extends ScratchPadError {
  constructor(id: string) {
    super(`Decision ${id} already has your answer, so you can't ask for changes.`)
  }
}

export class DecisionSentBackError extends ScratchPadError {
  constructor(id: string) {
    super(
      `Decision ${id} waits for the agent to change the page, so you can't answer it or ask for changes again.`,
    )
  }
}

export class DecisionNotWaitingForChangesError extends ScratchPadError {
  constructor(id: string) {
    super(`Decision ${id} doesn't have any changes requested, so there isn't anything to reopen.`)
  }
}

export class DecisionDoneError extends ScratchPadError {
  constructor(id: string) {
    super(
      `Decision ${id} has changes requested. Change the page. Then run reopen ${id} with a line about the change.`,
    )
  }
}

// A decision with changes requested is out of Nick's hands until the agent reopens the decision.
// The newest round of such a decision doesn't have an outcome.
export function isSentBack(rounds: readonly DecisionReview[]): boolean {
  const newest = rounds.at(-1)
  return newest !== undefined && newest.outcome === undefined
}

export function assertCanBeDecided(id: string, rounds: readonly DecisionReview[]): void {
  if (isSentBack(rounds)) {
    throw new DecisionSentBackError(id)
  }
}

// The newest round of each decision that has changes requested. The agent has to change the page
// for each of these rounds.
export function roundsWaitingForAgent(reviews: readonly DecisionReview[]): DecisionReview[] {
  return reviews.filter(
    (review) =>
      review.outcome === undefined &&
      !reviews.some((other) => other.id === review.id && other.round > review.round),
  )
}

// The rounds are the earlier rounds of the same decision. The new round follows them.
export function requestChanges(
  input: NewDecisionReview,
  rounds: readonly DecisionReview[],
  time: string,
): DecisionReview {
  if (!isDecisionId(input.id)) {
    throw new InvalidDecisionIdError(input.id)
  }
  const reason = input.reason.trim()
  if (reason === '') {
    throw new EmptyReasonError()
  }
  return { ...input, round: rounds.length + 1, reason, outcome: undefined, time }
}

// Returns the newest round, which now has an outcome. The earlier rounds already had one.
export function reopenDecision(
  id: string,
  rounds: readonly DecisionReview[],
  outcome: string,
): DecisionReview {
  const newest = rounds.at(-1)
  if (newest === undefined || !isSentBack(rounds)) {
    throw new DecisionNotWaitingForChangesError(id)
  }
  const line = outcome.trim()
  if (line === '') {
    throw new EmptyOutcomeError()
  }
  return { ...newest, outcome: line }
}

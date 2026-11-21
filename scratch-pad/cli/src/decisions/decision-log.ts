import { ScratchPadError } from '../scratch-pad-error'

export const decisionSources = ['chat', 'page'] as const
export type DecisionSource = (typeof decisionSources)[number]

export interface DecisionLogEntry {
  readonly number: number
  readonly time: string
  readonly source: DecisionSource
  readonly text: string
  readonly decision: string | undefined
}

type NewDecisionLogEntry = Omit<DecisionLogEntry, 'number'>

export class EmptyDecisionError extends ScratchPadError {
  constructor() {
    super('The decision is empty. Write the decision in one sentence.')
  }
}

interface LoggedDecision {
  readonly log: readonly DecisionLogEntry[]
  readonly entry: DecisionLogEntry
}

export function logDecision(
  log: readonly DecisionLogEntry[],
  newEntry: NewDecisionLogEntry,
): LoggedDecision {
  const text = newEntry.text.trim()
  if (text === '') {
    throw new EmptyDecisionError()
  }
  const earlier = log.find(
    (entry) => entry.decision !== undefined && entry.decision === newEntry.decision,
  )
  if (earlier === undefined) {
    const entry = { number: (log.at(-1)?.number ?? 0) + 1, ...newEntry, text }
    return { log: [...log, entry], entry }
  }
  const entry = { number: earlier.number, ...newEntry, text }
  return { log: log.map((logged) => (logged === earlier ? entry : logged)), entry }
}

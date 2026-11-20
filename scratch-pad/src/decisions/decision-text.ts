import { answerLine, type DecisionAnswer } from './decision-answer'

export function decisionInboxLines(decision: DecisionAnswer): string[] {
  return [decisionHeader(decision), `  ${answerLine(decision.answer)}`]
}

export function decisionShowLines(decision: DecisionAnswer): string[] {
  const state = decision.seenByAgent ? 'seen by the agent' : 'waits for the agent'
  return [`${decisionHeader(decision)} · ${state}`, `  ${answerLine(decision.answer)}`]
}

function decisionHeader(decision: DecisionAnswer): string {
  return `[${decision.id}] decision · ${decision.page}:${decision.line} · "${decision.question}"`
}

import { answerLine, type DecisionAnswer } from './decision-answer'

export function decisionInboxLines(decision: DecisionAnswer): string[] {
  return [decisionHeader(decision), `  ${answerLine(decision.answer)}`]
}

export function decisionShowLines(decision: DecisionAnswer): string[] {
  const state = decision.outcome === undefined ? 'waits for the agent' : 'done'
  return [
    `${decisionHeader(decision)} · ${state}`,
    `  ${answerLine(decision.answer)}`,
    ...(decision.outcome === undefined ? [] : [`  outcome: ${decision.outcome}`]),
  ]
}

function decisionHeader(decision: DecisionAnswer): string {
  return `[${decision.id}] decision · ${decision.page}:${decision.line} · "${decision.question}"`
}

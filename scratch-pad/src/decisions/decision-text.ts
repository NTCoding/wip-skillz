import { linkLines, pageLink, type ItemLinks } from '../item-links/item-links'
import { answerLine, type DecisionAnswer } from './decision-answer'

export function decisionInboxLines(decision: DecisionAnswer, links: ItemLinks): string[] {
  return [
    decisionHeader(decision),
    ...decisionLinkLines(decision, links),
    `  ${answerLine(decision.answer)}`,
  ]
}

export function decisionShowLines(decision: DecisionAnswer, links: ItemLinks): string[] {
  const state = decision.outcome === undefined ? 'waits for the agent' : 'done'
  return [
    `${decisionHeader(decision)} · ${state}`,
    ...decisionLinkLines(decision, links),
    `  ${answerLine(decision.answer)}`,
    ...(decision.outcome === undefined ? [] : [`  outcome: ${decision.outcome}`]),
  ]
}

function decisionHeader(decision: DecisionAnswer): string {
  return `[${decision.id}] decision · ${decision.page}:${decision.line} · "${decision.question}"`
}

function decisionLinkLines(decision: DecisionAnswer, links: ItemLinks): string[] {
  return linkLines(pageLink(links, decision.page, decision.id), '  ')
}

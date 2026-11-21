import { linkLines, pageLink, type ItemLinks } from '../item-links/item-links'
import { answerLine, type DecisionAnswer } from './decision-answer'

export function decisionInboxLines(
  decision: DecisionAnswer,
  file: string,
  links: ItemLinks,
): string[] {
  return [
    decisionHeader(decision, file),
    ...decisionLinkLines(decision, links),
    `  ${answerLine(decision.answer)}`,
  ]
}

export function decisionShowLines(
  decision: DecisionAnswer,
  file: string,
  links: ItemLinks,
): string[] {
  const state = decision.outcome === undefined ? 'waits for the agent' : 'done'
  return [
    `${decisionHeader(decision, file)} · ${state}`,
    ...decisionLinkLines(decision, links),
    `  ${answerLine(decision.answer)}`,
    ...(decision.outcome === undefined ? [] : [`  outcome: ${decision.outcome}`]),
  ]
}

function decisionHeader(decision: DecisionAnswer, file: string): string {
  return `[${decision.id}] decision · ${file}:${decision.line} · "${decision.question}"`
}

function decisionLinkLines(decision: DecisionAnswer, links: ItemLinks): string[] {
  return linkLines(pageLink(links, decision.page, decision.id), '  ')
}

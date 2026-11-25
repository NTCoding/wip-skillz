import { linkLines, pageLink, type ItemLinks } from '../item-links/item-links'
import { optionHeadingOf } from '../decision-pages/decision-page'
import { answerLine, type DecisionAnswer } from './decision-answer'
import { type DecisionReview } from './decision-review'

// The answer of a decision page is the choice of a numbered option. The lines of the page have the
// heading of the option, which the answer is printed with.
function chosenLine(decision: DecisionAnswer, pageLines: readonly string[]): string {
  const { answer } = decision
  return `  ${answerLine(answer, 'choice' in answer ? optionHeadingOf(pageLines, answer.choice) : undefined)}`
}

export function decisionInboxLines(
  decision: DecisionAnswer,
  file: string,
  links: ItemLinks,
  pageLines: readonly string[] = [],
): string[] {
  return [
    decisionHeader(decision, file),
    ...decisionLinkLines(decision, links),
    chosenLine(decision, pageLines),
  ]
}

export function decisionShowLines(
  decision: DecisionAnswer,
  file: string,
  links: ItemLinks,
  pageLines: readonly string[] = [],
): string[] {
  const state = decision.outcome === undefined ? 'waits for the agent' : 'done'
  return [
    `${decisionHeader(decision, file)} · ${state}`,
    ...decisionLinkLines(decision, links),
    chosenLine(decision, pageLines),
    ...(decision.outcome === undefined ? [] : [`  outcome: ${decision.outcome}`]),
  ]
}

function decisionHeader(
  decision: Pick<DecisionAnswer, 'id' | 'line' | 'question'>,
  file: string,
): string {
  return `[${decision.id}] decision · ${file}:${decision.line} · "${decision.question}"`
}

function decisionLinkLines(
  decision: Pick<DecisionAnswer, 'id' | 'page'>,
  links: ItemLinks,
): string[] {
  return linkLines(pageLink(links, decision.page, decision.id), '  ')
}

// A round without an outcome waits for the agent. A round with an outcome is a reopened decision.
function reviewHeader(review: DecisionReview, file: string): string {
  const state = review.outcome === undefined ? 'changes requested' : 'reopened'
  return `${decisionHeader(review, file)} · ${state}`
}

// The inbox only prints the newest round, which waits for the agent.
export function decisionReviewInboxLines(
  review: DecisionReview,
  file: string,
  links: ItemLinks,
): string[] {
  return [
    reviewHeader(review, file),
    ...decisionLinkLines(review, links),
    `  Nick requested changes: ${review.reason}`,
    `  Change the page, then run: reopen ${review.id} "<what you changed>"`,
  ]
}

// Every round of the decision, oldest first, with the reason of Nick and the outcome of the agent
export function decisionReviewHistoryLines(rounds: readonly DecisionReview[]): string[] {
  return rounds.flatMap((round) => [
    `  ${round.round}. Nick requested changes: ${round.reason}`,
    ...(round.outcome === undefined ? [] : [`     outcome: ${round.outcome}`]),
  ])
}

// The newest round gives the header and the state of the decision. The rounds are every round of
// the decision, oldest first.
export function decisionReviewShowLines(
  newest: DecisionReview,
  rounds: readonly DecisionReview[],
  file: string,
  links: ItemLinks,
): string[] {
  return [
    reviewHeader(newest, file),
    ...decisionLinkLines(newest, links),
    ...decisionReviewHistoryLines(rounds),
  ]
}

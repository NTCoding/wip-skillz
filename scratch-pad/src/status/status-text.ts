import { countsByType, itemsWaitingForAgent } from '../agent-inbox/agent-inbox'
import { itemCountText } from '../agent-inbox/agent-inbox-text'
import { countedNoun, listOfCounts } from '../counted-noun'
import { type DecisionAnswer } from '../decisions/decision-answer'
import {
  linkLines,
  missingLinksLine,
  padLink,
  progressTrackerLink,
  type ItemLinks,
} from '../item-links/item-links'
import { type ProgressTracker } from '../progress-tracker/progress-tracker'
import { currentTaskLine } from '../progress-tracker/progress-tracker-text'
import { type Thread } from '../threads/thread'

interface StatusOfScratchPad {
  readonly padPath: string
  readonly links: ItemLinks
  readonly tracker: ProgressTracker
  readonly threads: readonly Thread[]
  readonly decisions: readonly DecisionAnswer[]
  readonly nickInbox: {
    readonly threads: readonly Thread[]
    readonly decisions: readonly unknown[]
  }
}

export function statusText(status: StatusOfScratchPad): string {
  const forAgent = countsByType(itemsWaitingForAgent(status.threads, status.decisions))
  const decisions = status.nickInbox.decisions.length
  const replies = status.nickInbox.threads.length
  const forNick = [
    ...(decisions === 0 ? [] : [countedNoun(decisions, 'decision')]),
    ...(replies === 0 ? [] : [countedNoun(replies, 'reply', 'replies')]),
  ]
  const { links } = status
  const padAddress = padLink(links)
  return [
    `${links.pad} · ${status.padPath}`,
    padAddress === undefined ? missingLinksLine(links.pad) : `in the browser: ${padAddress}`,
    currentTaskLine(status.tracker),
    ...linkLines(progressTrackerLink(links)),
    `waiting for the agent: ${listOfCounts(forAgent.map(itemCountText))}`,
    `waiting for Nick: ${listOfCounts(forNick)}`,
  ].join('\n')
}

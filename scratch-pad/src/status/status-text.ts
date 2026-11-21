import { countsByType, itemsWaitingForAgent } from '../agent-inbox/agent-inbox'
import { itemCountText } from '../agent-inbox/agent-inbox-text'
import { countedNoun, listOfCounts } from '../counted-noun'
import { type DecisionAnswer } from '../decisions/decision-answer'
import { type ProgressTracker } from '../progress-tracker/progress-tracker'
import { currentTaskLine } from '../progress-tracker/progress-tracker-text'
import { type Thread } from '../threads/thread'

interface StatusOfScratchPad {
  readonly padName: string
  readonly padPath: string
  readonly pageAddress: string | undefined
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
  return [
    `${status.padName} · ${status.padPath}`,
    ...(status.pageAddress === undefined ? [] : [`in the browser: ${status.pageAddress}`]),
    currentTaskLine(status.tracker),
    `waiting for the agent: ${listOfCounts(forAgent.map(itemCountText))}`,
    `waiting for Nick: ${listOfCounts(forNick)}`,
  ].join('\n')
}

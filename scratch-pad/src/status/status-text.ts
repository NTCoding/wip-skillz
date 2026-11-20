import { countsByType, itemsWaitingForAgent } from '../agent-inbox/agent-inbox'
import { itemCountText } from '../agent-inbox/agent-inbox-text'
import { countedNoun, listOfCounts } from '../counted-noun'
import { type DecisionAnswer } from '../decisions/decision-answer'
import { nickInbox } from '../nick-inbox/nick-inbox'
import { type ProgressTracker } from '../progress-tracker/progress-tracker'
import { currentTaskLine } from '../progress-tracker/progress-tracker-text'
import { type Thread } from '../threads/thread'

interface StatusOfScratchPad {
  readonly padName: string
  readonly padPath: string
  readonly tracker: ProgressTracker
  readonly threads: readonly Thread[]
  readonly decisions: readonly DecisionAnswer[]
}

export function statusText(status: StatusOfScratchPad): string {
  const forAgent = countsByType(itemsWaitingForAgent(status.threads, status.decisions))
  const forNick = nickInbox(status.threads).length
  return [
    `${status.padName} · ${status.padPath}`,
    currentTaskLine(status.tracker),
    `waiting for the agent: ${listOfCounts(forAgent.map(itemCountText))}`,
    `waiting for Nick: ${listOfCounts(forNick === 0 ? [] : [countedNoun(forNick, 'reply', 'replies')])}`,
  ].join('\n')
}

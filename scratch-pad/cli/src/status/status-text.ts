import {
  countsByType,
  itemsWaitingForAgent,
  tasksDoneByNick,
  type LastPrintedEvents,
} from '../agent-inbox/agent-inbox'
import { itemCountText } from '../agent-inbox/agent-inbox-text'
import { countedNoun, listOfCounts } from '../counted-noun'
import { type DecisionAnswer } from '../decisions/decision-answer'
import { type DecisionReview } from '../decisions/decision-review'
import { type ScratchPadEvent } from '../events/scratch-pad-event'
import {
  linkLines,
  missingLinksLine,
  padLink,
  progressTrackerLink,
  type ItemLinks,
} from '../item-links/item-links'
import { trackerItems, type ProgressTracker } from '../progress-tracker/progress-tracker'
import { currentTaskLine, trackerProblemTexts } from '../progress-tracker/progress-tracker-text'
import { type Thread } from '../threads/thread'

interface StatusOfScratchPad {
  readonly padPath: string
  readonly links: ItemLinks
  readonly tracker: ProgressTracker
  readonly threads: readonly Thread[]
  readonly decisions: readonly DecisionAnswer[]
  readonly reviews: readonly DecisionReview[]
  readonly events: readonly ScratchPadEvent[]
  readonly lastPrinted: LastPrintedEvents
  readonly nickInbox: {
    readonly threads: readonly Thread[]
    readonly decisions: readonly unknown[]
  }
}

export function statusText(status: StatusOfScratchPad): string {
  // A task that Nick has done waits for the agent until inbox or wait has printed the task
  const forAgent = countsByType([
    ...itemsWaitingForAgent(status.threads, status.decisions, status.reviews),
    ...tasksDoneByNick(status),
  ])
  const decisions = status.nickInbox.decisions.length
  const replies = status.nickInbox.threads.length
  // The tasks and the subtasks that are assigned to Nick and aren't done yet
  const tasks = trackerItems(status.tracker).filter(
    (item) => item.assignment !== undefined && item.state !== 'done',
  ).length
  const forNick = [
    ...(decisions === 0 ? [] : [countedNoun(decisions, 'decision')]),
    ...(replies === 0 ? [] : [countedNoun(replies, 'reply', 'replies')]),
    ...(tasks === 0 ? [] : [countedNoun(tasks, 'task')]),
  ]
  const { links } = status
  const padAddress = padLink(links)
  return [
    `${links.pad} · ${status.padPath}`,
    padAddress === undefined ? missingLinksLine(links.pad) : `in the browser: ${padAddress}`,
    currentTaskLine(status.tracker),
    ...linkLines(progressTrackerLink(links)),
    ...trackerProblemTexts(status.tracker).map((problem) => `problem: ${problem}`),
    `waiting for the agent: ${listOfCounts(forAgent.map(itemCountText))}`,
    `waiting for Nick: ${listOfCounts(forNick)}`,
  ].join('\n')
}

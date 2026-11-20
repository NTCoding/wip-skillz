import { selectAgentInbox } from '../agent-inbox/agent-inbox'
import { agentInboxText } from '../agent-inbox/agent-inbox-text'
import { markSeenByAgent } from '../decisions/decision-answer'
import { type ItemType } from '../items/item-id'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { statusText } from '../status/status-text'

interface InboxRequest {
  readonly types: readonly ItemType[]
  readonly includeSeen: boolean
}

export function readAgentInbox(folder: ScratchPadFolder, request: InboxRequest): string {
  const selection = selectAgentInbox({
    threads: folder.readThreads(),
    decisions: folder.readDecisionAnswers(),
    events: folder.readEvents(),
    lastPrinted: folder.readLastPrintedEvents(),
    types: request.types,
    includeSeen: request.includeSeen,
  })
  folder.writeLastPrintedEvents(selection.lastPrinted)
  selection.printed
    .flatMap((item) => (item.kind === 'decision' ? [item.decision] : []))
    .forEach((decision) => folder.writeDecisionAnswer(markSeenByAgent(decision)))
  return agentInboxText(selection, {
    padName: folder.name,
    includeSeen: request.includeSeen,
    pageLines: (page) => folder.readPageLines(page),
  })
}

export function scratchPadStatus(folder: ScratchPadFolder): string {
  return statusText({
    padName: folder.name,
    padPath: folder.path,
    tracker: folder.readProgressTracker(),
    threads: folder.readThreads(),
    decisions: folder.readDecisionAnswers(),
  })
}

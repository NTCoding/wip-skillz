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
  const selection = folder.change((pad) => {
    const selected = selectAgentInbox({
      threads: pad.readThreads(),
      decisions: pad.readDecisionAnswers(),
      events: pad.readEvents(),
      lastPrinted: pad.readLastPrintedEvents(),
      types: request.types,
      includeSeen: request.includeSeen,
    })
    pad.writeLastPrintedEvents(selected.lastPrinted)
    selected.printed
      .flatMap((item) => (item.kind === 'decision' ? [item.decision] : []))
      .forEach((decision) => pad.writeDecisionAnswer(markSeenByAgent(decision)))
    return selected
  })
  return agentInboxText(selection, {
    padName: folder.name,
    includeSeen: request.includeSeen,
    pageLines: (page) => folder.readPageLines(page),
  })
}

export function scratchPadStatus(folder: ScratchPadFolder): string {
  return folder.read((pad) =>
    statusText({
      padName: folder.name,
      padPath: folder.path,
      tracker: pad.readProgressTracker(),
      threads: pad.readThreads(),
      decisions: pad.readDecisionAnswers(),
    }),
  )
}

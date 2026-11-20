import { selectAgentInbox, type AgentInboxSelection } from '../agent-inbox/agent-inbox'
import { agentInboxText } from '../agent-inbox/agent-inbox-text'
import { markSeenByAgent } from '../decisions/decision-answer'
import { type ItemType } from '../items/item-id'
import { type PadDb } from '../scratch-pad-folder/pad-db'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { statusText } from '../status/status-text'

interface InboxRequest {
  readonly types: readonly ItemType[]
  readonly includeSeen: boolean
}

export function readAgentInbox(folder: ScratchPadFolder, request: InboxRequest): string {
  const selection = folder.change((pad) => {
    const selected = selectFromPadDb(pad, request)
    recordAsPrinted(pad, selected)
    return selected
  })
  return printedInboxText(folder, selection, request.includeSeen)
}

export function selectFromPadDb(pad: PadDb, request: InboxRequest): AgentInboxSelection {
  return selectAgentInbox({
    threads: pad.readThreads(),
    decisions: pad.readDecisionAnswers(),
    events: pad.readEvents(),
    lastPrinted: pad.readLastPrintedEvents(),
    types: request.types,
    includeSeen: request.includeSeen,
  })
}

export function recordAsPrinted(pad: PadDb, selected: AgentInboxSelection): void {
  pad.writeLastPrintedEvents(selected.lastPrinted)
  selected.printed
    .flatMap((item) => (item.kind === 'decision' ? [item.decision] : []))
    .forEach((decision) => pad.writeDecisionAnswer(markSeenByAgent(decision)))
}

export function printedInboxText(
  folder: ScratchPadFolder,
  selection: AgentInboxSelection,
  includeSeen: boolean,
): string {
  return agentInboxText(selection, {
    padName: folder.name,
    includeSeen,
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

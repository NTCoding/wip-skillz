import { selectAgentInbox, type AgentInboxSelection } from '../agent-inbox/agent-inbox'
import { agentInboxText } from '../agent-inbox/agent-inbox-text'
import { type ItemType } from '../items/item-id'
import { nickInboxItems } from '../nick-views/nick-views'
import { type ItemLinks } from '../item-links/item-links'
import { type PadDb } from '../scratch-pad-folder/pad-db'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { statusText } from '../status/status-text'

interface InboxRequest {
  readonly types: readonly ItemType[]
  readonly includeSeen: boolean
}

export function readAgentInbox(
  folder: ScratchPadFolder,
  request: InboxRequest,
  links: ItemLinks,
): string {
  const selection = folder.change((pad) => {
    const selected = selectFromPadDb(pad, request)
    recordAsPrinted(pad, selected)
    return selected
  })
  return printedInboxText(folder, selection, request.includeSeen, links)
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
}

export function printedInboxText(
  folder: ScratchPadFolder,
  selection: AgentInboxSelection,
  includeSeen: boolean,
  links: ItemLinks,
): string {
  return agentInboxText(selection, {
    links,
    includeSeen,
    pageLines: (page) => folder.readPageLines(page),
  })
}

export function scratchPadStatus(folder: ScratchPadFolder, links: ItemLinks): string {
  const nickInbox = nickInboxItems(folder)
  return folder.read((pad) =>
    statusText({
      padPath: folder.path,
      links,
      tracker: pad.readProgressTracker(),
      threads: pad.readThreads(),
      decisions: pad.readDecisionAnswers(),
      nickInbox,
    }),
  )
}

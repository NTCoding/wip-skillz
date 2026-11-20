import { setTimeout as sleep } from 'node:timers/promises'
import { type AgentInboxSelection } from '../agent-inbox/agent-inbox'
import { momentNickIsQuiet } from '../agent-inbox/nick-quiet'
import { type ItemType } from '../items/item-id'
import { type PadDbWatch } from '../scratch-pad-folder/pad-db-watch'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { printedInboxText, recordAsPrinted, selectFromPadDb } from './inbox-commands'

export interface WaitRequest {
  readonly types: readonly ItemType[]
  readonly quietMilliseconds: number
  readonly timeoutMilliseconds: number | undefined
  readonly checkMilliseconds: number
  readonly stopSignal: AbortSignal
}

type WaitCheck =
  | { readonly kind: 'printed'; readonly selection: AgentInboxSelection }
  | { readonly kind: 'waiting'; readonly until: number }

export async function waitForAgentInbox(
  folder: ScratchPadFolder,
  request: WaitRequest,
): Promise<string> {
  const deadline =
    request.timeoutMilliseconds === undefined
      ? Number.POSITIVE_INFINITY
      : Date.now() + request.timeoutMilliseconds
  const watch = folder.watchPadDb()
  try {
    for (;;) {
      const check = printOnceNickIsQuiet(folder, request)
      if (check.kind === 'printed') {
        return printedInboxText(folder, check.selection, false)
      }
      if (Date.now() >= deadline || request.stopSignal.aborted) {
        return `the wait ended before a new item arrived in ${folder.name}`
      }
      await nextChange(watch, Math.min(deadline, check.until), request)
    }
  } finally {
    watch.close()
  }
}

function printOnceNickIsQuiet(folder: ScratchPadFolder, request: WaitRequest): WaitCheck {
  return folder.change((pad) => {
    const selected = selectFromPadDb(pad, { types: request.types, includeSeen: false })
    if (selected.printed.length === 0) {
      return { kind: 'waiting', until: Number.POSITIVE_INFINITY }
    }
    const quietAt = momentNickIsQuiet(pad.readEvents(), request.quietMilliseconds)
    if (Date.now() < quietAt) {
      return { kind: 'waiting', until: quietAt }
    }
    recordAsPrinted(pad, selected)
    return { kind: 'printed', selection: selected }
  })
}

async function nextChange(watch: PadDbWatch, wakeAt: number, request: WaitRequest): Promise<void> {
  while (!request.stopSignal.aborted && Date.now() < wakeAt && !watch.hasChanged()) {
    await sleep(Math.min(request.checkMilliseconds, wakeAt - Date.now()))
  }
}

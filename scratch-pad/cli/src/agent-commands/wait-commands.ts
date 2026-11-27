import { setTimeout as sleep } from 'node:timers/promises'
import { type AgentInboxSelection } from '../agent-inbox/agent-inbox'
import { momentNickIsQuiet } from '../agent-inbox/nick-quiet'
import { type ItemType } from '../items/item-id'
import { type ItemLinks } from '../item-links/item-links'
import { type PadDbWatch } from '../scratch-pad-folder/pad-db-watch'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { brokenDecisionPageLines } from './decision-page-commands'
import { printedInboxText, recordAsPrinted, selectFromPadDb } from './inbox-commands'

export interface WaitRequest {
  readonly types: readonly ItemType[]
  readonly quietMilliseconds: number
  readonly timeoutMilliseconds: number | undefined
  readonly checkMilliseconds: number
  readonly stopSignal: AbortSignal
  readonly links: () => Promise<ItemLinks>
}

type WaitCheck =
  | { readonly kind: 'printed'; readonly selection: AgentInboxSelection }
  | { readonly kind: 'waiting'; readonly until: number }

export async function waitForAgentInbox(
  folder: ScratchPadFolder,
  request: WaitRequest,
): Promise<string> {
  const batches: string[] = []
  await waitForBatches(folder, request, (text) => batches.push(text), 'one batch')
  return batches[0] ?? `the wait ended before a new item arrived in ${folder.name}`
}

// Prints every batch of new items as soon as it's ready, until the wait is stopped.
export async function followAgentInbox(
  folder: ScratchPadFolder,
  request: WaitRequest,
  printBatch: (text: string) => void,
): Promise<void> {
  await waitForBatches(folder, request, printBatch, 'every batch')
}

async function waitForBatches(
  folder: ScratchPadFolder,
  request: WaitRequest,
  printBatch: (text: string) => void,
  howMany: 'one batch' | 'every batch',
): Promise<void> {
  const deadline =
    request.timeoutMilliseconds === undefined
      ? Number.POSITIVE_INFINITY
      : Date.now() + request.timeoutMilliseconds
  const watch = folder.watchPadDb()
  const problems = new KnownProblems(folder)
  try {
    for (;;) {
      const timedOut = Date.now() >= deadline
      const check = printOnceNickIsQuiet(folder, request, timedOut)
      if (check.kind === 'printed') {
        printBatch(printedInboxText(folder, check.selection, false, await request.links()))
      } else if (problems.haveNewOnes()) {
        printBatch(
          printedInboxText(folder, nothingNew(folder, request), false, await request.links()),
        )
      } else if (timedOut || request.stopSignal.aborted) {
        return
      } else {
        await nextChange(watch, Math.min(deadline, check.until), request, () => problems.changed())
        continue
      }
      if (howMany === 'one batch' || request.stopSignal.aborted) {
        return
      }
    }
  } finally {
    watch.close()
  }
}

function printOnceNickIsQuiet(
  folder: ScratchPadFolder,
  request: WaitRequest,
  timedOut: boolean,
): WaitCheck {
  return folder.change((pad) => {
    const selected = selectFromPadDb(pad, { types: request.types, includeSeen: false })
    if (selected.printed.length === 0) {
      return { kind: 'waiting', until: Number.POSITIVE_INFINITY }
    }
    const quietAt = momentNickIsQuiet(pad.readEvents(), request.quietMilliseconds)
    if (!timedOut && Date.now() < quietAt) {
      return { kind: 'waiting', until: quietAt }
    }
    recordAsPrinted(pad, selected)
    return { kind: 'printed', selection: selected }
  })
}

function brokenPagesText(folder: ScratchPadFolder): string {
  return brokenDecisionPageLines(folder).join('\n')
}

// The problems of the decision pages that the agent already knows about. The agent is told again
// when a page that was ready breaks or when the problems of a broken page change.
class KnownProblems {
  private known: string

  constructor(private readonly folder: ScratchPadFolder) {
    this.known = brokenPagesText(folder)
  }

  changed(): boolean {
    return brokenPagesText(this.folder) !== this.known
  }

  // The problems have changed since the last call and the pages still have a problem
  haveNewOnes(): boolean {
    const now = brokenPagesText(this.folder)
    const changed = now !== this.known
    this.known = now
    return changed && now !== ''
  }
}

// The selection of an inbox that doesn't have any new item
function nothingNew(folder: ScratchPadFolder, request: WaitRequest): AgentInboxSelection {
  return folder.read((pad) => selectFromPadDb(pad, { types: request.types, includeSeen: false }))
}

async function nextChange(
  watch: PadDbWatch,
  wakeAt: number,
  request: WaitRequest,
  pagesChanged: () => boolean,
): Promise<void> {
  while (
    !request.stopSignal.aborted &&
    Date.now() < wakeAt &&
    !watch.hasChanged() &&
    !pagesChanged()
  ) {
    await sleep(Math.min(request.checkMilliseconds, wakeAt - Date.now()))
  }
}

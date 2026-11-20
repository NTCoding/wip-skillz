import { countedNoun } from '../counted-noun'
import { decisionInboxLines } from '../decisions/decision-text'
import { itemTypeNoun } from '../items/item-id'
import { threadInboxLines } from '../threads/thread-text'
import { type AgentInboxItem, type AgentInboxSelection, type ItemCount } from './agent-inbox'

export interface AgentInboxTextContext {
  readonly padName: string
  readonly includeSeen: boolean
  readonly pageLines: (page: string) => readonly string[]
}

export function agentInboxText(
  selection: AgentInboxSelection,
  context: AgentInboxTextContext,
): string {
  const items = selection.printed.flatMap((item) => ['', ...itemLines(item, context)])
  const sideNotes =
    selection.sideNotes.length === 0
      ? []
      : [...(items.length === 0 ? [] : ['']), sideNotesLine(selection.sideNotes)]
  return [headerLine(selection, context), ...items, ...sideNotes].join('\n')
}

export function itemCountText(entry: ItemCount): string {
  return countedNoun(entry.count, itemTypeNoun(entry.type))
}

function headerLine(selection: AgentInboxSelection, context: AgentInboxTextContext): string {
  const count = selection.printed.length
  if (count > 0) {
    return context.includeSeen
      ? `${countedNoun(count, 'item')} ${waitVerb(count)} for the agent in ${context.padName}`
      : `${countedNoun(count, 'new item')} in ${context.padName}`
  }
  if (context.includeSeen) {
    return `nothing waits for the agent in ${context.padName}`
  }
  return selection.seenBefore === 0
    ? `nothing new in ${context.padName}`
    : `nothing new in ${context.padName} · ${countedNoun(selection.seenBefore, 'item')} printed before (scratch-pad inbox --all)`
}

function itemLines(item: AgentInboxItem, context: AgentInboxTextContext): string[] {
  return item.kind === 'thread'
    ? threadInboxLines(item.thread, context.pageLines(item.thread.page))
    : decisionInboxLines(item.decision)
}

function sideNotesLine(sideNotes: readonly ItemCount[]): string {
  const total = sideNotes.reduce((sum, entry) => sum + entry.count, 0)
  return `${sideNotes.map(itemCountText).join(' and ')} ${waitVerb(total)} for a subagent`
}

function waitVerb(count: number): string {
  return count === 1 ? 'waits' : 'wait'
}

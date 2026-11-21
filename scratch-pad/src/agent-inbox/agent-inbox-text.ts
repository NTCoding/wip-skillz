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
  const summary = [
    ...(selection.otherItems.length === 0
      ? []
      : [otherItemsText(selection.otherItems, context.padName)]),
    ...(selection.sideNotes.length === 0 ? [] : [sideNotesText(selection.sideNotes)]),
  ]
  const summaryLines =
    summary.length === 0 ? [] : [...(items.length === 0 ? [] : ['']), summary.join(' · ')]
  return [headerLine(selection, context), ...items, ...summaryLines].join('\n')
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
    : `nothing new in ${context.padName} · ${countedNoun(selection.seenBefore, 'item')} printed before (scratch-pad inbox --pad ${context.padName} --all)`
}

function itemLines(item: AgentInboxItem, context: AgentInboxTextContext): string[] {
  return item.kind === 'thread'
    ? threadInboxLines(item.thread, context.pageLines(item.thread.page), context.padName)
    : decisionInboxLines(item.decision)
}

function sideNotesText(sideNotes: readonly ItemCount[]): string {
  return `${countsText(sideNotes)} ${waitVerb(totalOf(sideNotes))} for a subagent`
}

function otherItemsText(otherItems: readonly ItemCount[], padName: string): string {
  const types = otherItems.map((entry) => entry.type).join(',')
  return `${countsText(otherItems)} ${waitVerb(totalOf(otherItems))} for the agent (scratch-pad inbox --pad ${padName} --type ${types})`
}

function countsText(counts: readonly ItemCount[]): string {
  return counts.map(itemCountText).join(' and ')
}

function totalOf(counts: readonly ItemCount[]): number {
  return counts.reduce((sum, entry) => sum + entry.count, 0)
}

function waitVerb(count: number): string {
  return count === 1 ? 'waits' : 'wait'
}

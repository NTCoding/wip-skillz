import { countedNoun } from '../counted-noun'
import { decisionInboxLines } from '../decisions/decision-text'
import { itemTypeNoun } from '../items/item-id'
import { linkLines, missingLinksLine, taskLink, type ItemLinks } from '../item-links/item-links'
import { type PageLines } from '../pages/page-files'
import { type TrackerItem } from '../progress-tracker/progress-tracker'
import { taskLine } from '../progress-tracker/progress-tracker-text'
import { threadInboxLines } from '../threads/thread-text'
import { type AgentInboxItem, type AgentInboxSelection, type ItemCount } from './agent-inbox'

export interface AgentInboxTextContext {
  readonly links: ItemLinks
  readonly includeSeen: boolean
  readonly readPage: (page: string) => PageLines
}

export function agentInboxText(
  selection: AgentInboxSelection,
  context: AgentInboxTextContext,
): string {
  const items = selection.printed.flatMap((item) => ['', ...itemLines(item, context)])
  const summary = [
    ...(selection.otherItems.length === 0
      ? []
      : [otherItemsText(selection.otherItems, context.links.pad)]),
    ...(selection.sideNotes.length === 0 ? [] : [sideNotesText(selection.sideNotes)]),
  ]
  const summaryLines =
    summary.length === 0 ? [] : [...(items.length === 0 ? [] : ['']), summary.join(' · ')]
  const missingLinks =
    items.length === 0 || context.links.origin !== undefined
      ? []
      : ['', missingLinksLine(context.links.pad)]
  return [headerLine(selection, context), ...items, ...summaryLines, ...missingLinks].join('\n')
}

export function itemCountText(entry: ItemCount): string {
  return countedNoun(entry.count, entry.type === 'task' ? 'task' : itemTypeNoun(entry.type))
}

function headerLine(selection: AgentInboxSelection, context: AgentInboxTextContext): string {
  const count = selection.printed.length
  if (count > 0) {
    return context.includeSeen
      ? `${countedNoun(count, 'item')} ${waitVerb(count)} for the agent in ${context.links.pad}`
      : `${countedNoun(count, 'new item')} in ${context.links.pad}`
  }
  if (context.includeSeen) {
    return `nothing waits for the agent in ${context.links.pad}`
  }
  return selection.seenBefore === 0
    ? `nothing new in ${context.links.pad}`
    : `nothing new in ${context.links.pad} · ${countedNoun(selection.seenBefore, 'item')} printed before (scratch-pad inbox --pad ${context.links.pad} --all)`
}

function itemLines(item: AgentInboxItem, context: AgentInboxTextContext): string[] {
  if (item.kind === 'thread') {
    return threadInboxLines(item.thread, context.readPage(item.thread.page), context.links)
  }
  return item.kind === 'decision'
    ? decisionInboxLines(item.decision, context.readPage(item.decision.page).file, context.links)
    : doneTaskLines(item.task, item.started, context.links)
}

// A task or a subtask that was assigned to Nick, which he has marked as done in the browser. The
// task that was started after it is printed in the same way as by `task done`.
function doneTaskLines(
  task: TrackerItem,
  started: TrackerItem | undefined,
  links: ItemLinks,
): string[] {
  return [
    taskLine(task, 'is done'),
    ...linkLines(taskLink(links, task.id), '  '),
    '  Nick marked it as done in the browser.',
    ...(started === undefined ? [] : [`  ${taskLine(started, 'has started')}`]),
  ]
}

function sideNotesText(sideNotes: readonly ItemCount[]): string {
  return `${countsText(sideNotes)} ${waitVerb(totalOf(sideNotes))} for a subagent`
}

// A task that Nick has done is printed with the decisions. That's why --type decision prints the task.
function otherItemsText(otherItems: readonly ItemCount[], padName: string): string {
  const types = [
    ...new Set(otherItems.map((entry) => (entry.type === 'task' ? 'decision' : entry.type))),
  ].join(',')
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

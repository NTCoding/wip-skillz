import { countedNoun } from '../counted-noun'
import { localTime } from '../local-time'
import { itemTypeNoun } from '../items/item-id'
import { numberedLines } from '../pages/page-text'
import { sectionAt } from '../pages/page-markdown'
import { normalisedText } from '../rendered-page/page-blocks'
import {
  messagesSinceAgentReply,
  type Author,
  type Message,
  type Thread,
  type WaitingParty,
} from './thread'
import { positionedThread, type PositionedThread } from './thread-position'

interface LineRange {
  readonly firstLine: number
  readonly lastLine: number
}

const shortBlockLines = 8
const previewLines = 5
const longestSelection = 160

const authorNames: Readonly<Record<Author, string>> = { nick: 'Nick', agent: 'agent' }

const waitingTexts: Readonly<Record<WaitingParty, string>> = {
  nick: 'waits for Nick',
  agent: 'waits for the agent',
  nobody: 'closed',
}

export function threadInboxLines(
  stored: Thread,
  pageLines: readonly string[],
  padName: string,
): string[] {
  const thread = positionedThread(stored, pageLines.join('\n'))
  const newMessages = messagesSinceAgentReply(thread)
  const earlierMessages = thread.messages.length - newMessages.length
  return [
    threadHeader(thread, pageLines),
    ...selectedLines(thread),
    ...(earlierMessages === 0
      ? []
      : [
          `  earlier: ${countedNoun(earlierMessages, 'message')} (${showCommand(padName, thread.id)})`,
        ]),
    ...newMessages.map((entry) => `  ${authorNames[entry.author]}: ${indented(entry.text)}`),
    ...blockLines(thread, pageLines, { length: 'preview', padName }),
  ]
}

export function threadShowLines(stored: Thread, pageLines: readonly string[]): string[] {
  const thread = positionedThread(stored, pageLines.join('\n'))
  return [
    `${threadHeader(thread, pageLines)} · ${waitingTexts[thread.waitsFor]}`,
    ...selectedLines(thread),
    ...blockLines(thread, pageLines, { length: 'whole' }),
    ...thread.messages.map(timedMessageLine),
    ...(thread.outcome === undefined ? [] : [`  outcome: ${thread.outcome}`]),
  ]
}

function threadHeader(thread: PositionedThread, pageLines: readonly string[]): string {
  const name = `[${thread.id}] ${itemTypeNoun(thread.type)}`
  const { anchor, position } = thread
  if (anchor === undefined || position === undefined) {
    return `${name} · ${thread.page}`
  }
  if (position.kind === 'detached') {
    return `${name} · ${thread.page} · detached from ${lineWord(anchor)} ${lineRange(anchor)}`
  }
  const location = `${thread.page}:${lineRange(position)}`
  const section = sectionAt(pageLines, position.firstLine)
  return section === undefined
    ? `${name} · ${location}`
    : `${name} · ${location} · section "${section}"`
}

function selectedLines({ anchor, position }: PositionedThread): string[] {
  if (anchor === undefined || position === undefined) {
    return []
  }
  const selected = normalisedText(anchor.selectedText)
  const changed =
    position.kind === 'attached' && position.text !== selected
      ? [quotedLine('now', position.text)]
      : []
  return [quotedLine('selected', selected), ...changed]
}

function quotedLine(label: string, text: string): string {
  const shortened =
    text.length > longestSelection ? `${text.slice(0, longestSelection - 1)}…` : text
  return `  ${label}: "${shortened}"`
}

type BlockLength =
  { readonly length: 'preview'; readonly padName: string } | { readonly length: 'whole' }

function showCommand(padName: string, id: string): string {
  return `scratch-pad show --pad ${padName} ${id}`
}

function blockLines(
  thread: PositionedThread,
  pageLines: readonly string[],
  shown: BlockLength,
): string[] {
  const { position } = thread
  if (position === undefined) {
    return []
  }
  if (position.kind === 'detached') {
    return pageLines.length === 0
      ? [`  block: (${thread.page} doesn't exist any more)`]
      : [`  block: (the selected text isn't in ${thread.page} any more)`]
  }
  const lines = numberedLines(pageLines, position.firstLine, position.lastLine)
  if (shown.length === 'whole' || lines.length <= shortBlockLines) {
    return ['  block:', ...lines]
  }
  return [
    '  block:',
    ...lines.slice(0, previewLines),
    `    … ${lines.length - previewLines} more lines (${showCommand(shown.padName, thread.id)})`,
  ]
}

function timedMessageLine(entry: Message): string {
  return `  ${authorNames[entry.author]} (${localTime(entry.time)}): ${indented(entry.text)}`
}

function lineWord(lines: LineRange): string {
  return lines.firstLine === lines.lastLine ? 'line' : 'lines'
}

function lineRange(lines: LineRange): string {
  return lines.firstLine === lines.lastLine
    ? String(lines.firstLine)
    : `${lines.firstLine}-${lines.lastLine}`
}

function indented(text: string): string {
  return text.trim().split('\n').join('\n    ')
}

import { countedNoun } from '../counted-noun'
import { localTime } from '../local-time'
import { itemTypeNoun } from '../items/item-id'
import { numberedLines } from '../pages/page-text'
import { sectionAt } from '../pages/page-markdown'
import {
  messagesSinceAgentReply,
  type Anchor,
  type Author,
  type Message,
  type Thread,
  type WaitingParty,
} from './thread'

const shortBlockLines = 8
const previewLines = 5
const longestSelection = 160

const authorNames: Readonly<Record<Author, string>> = { nick: 'Nick', agent: 'agent' }

const waitingTexts: Readonly<Record<WaitingParty, string>> = {
  nick: 'waits for Nick',
  agent: 'waits for the agent',
  nobody: 'closed',
}

export function threadInboxLines(thread: Thread, pageLines: readonly string[]): string[] {
  const newMessages = messagesSinceAgentReply(thread)
  const earlierMessages = thread.messages.length - newMessages.length
  return [
    threadHeader(thread, pageLines),
    ...selectedLines(thread.anchor),
    ...(earlierMessages === 0
      ? []
      : [`  earlier: ${countedNoun(earlierMessages, 'message')} (scratch-pad show ${thread.id})`]),
    ...newMessages.map((entry) => `  ${authorNames[entry.author]}: ${indented(entry.text)}`),
    ...blockLines(thread, pageLines, 'preview'),
  ]
}

export function threadShowLines(thread: Thread, pageLines: readonly string[]): string[] {
  return [
    `${threadHeader(thread, pageLines)} · ${waitingTexts[thread.waitsFor]}`,
    ...selectedLines(thread.anchor),
    ...blockLines(thread, pageLines, 'whole'),
    ...thread.messages.map(timedMessageLine),
    ...(thread.outcome === undefined ? [] : [`  outcome: ${thread.outcome}`]),
  ]
}

function threadHeader(thread: Thread, pageLines: readonly string[]): string {
  const name = `[${thread.id}] ${itemTypeNoun(thread.type)}`
  if (thread.anchor === undefined) {
    return `${name} · ${thread.page}`
  }
  const location = `${thread.page}:${lineRange(thread.anchor)}`
  const section = sectionAt(pageLines, thread.anchor.firstLine)
  return section === undefined
    ? `${name} · ${location}`
    : `${name} · ${location} · section "${section}"`
}

function selectedLines(anchor: Anchor | undefined): string[] {
  if (anchor === undefined) {
    return []
  }
  const text = anchor.selectedText.replaceAll(/\s+/g, ' ').trim()
  const shortened =
    text.length > longestSelection ? `${text.slice(0, longestSelection - 1)}…` : text
  return [`  selected: "${shortened}"`]
}

function blockLines(
  thread: Thread,
  pageLines: readonly string[],
  length: 'preview' | 'whole',
): string[] {
  if (thread.anchor === undefined) {
    return []
  }
  const shown = numberedLines(pageLines, thread.anchor.firstLine, thread.anchor.lastLine)
  if (shown.length === 0) {
    return [`  block: (lines ${lineRange(thread.anchor)} aren't in ${thread.page} any more)`]
  }
  if (length === 'whole' || shown.length <= shortBlockLines) {
    return ['  block:', ...shown]
  }
  return [
    '  block:',
    ...shown.slice(0, previewLines),
    `    … ${shown.length - previewLines} more lines (scratch-pad show ${thread.id})`,
  ]
}

function timedMessageLine(entry: Message): string {
  return `  ${authorNames[entry.author]} (${localTime(entry.time)}): ${indented(entry.text)}`
}

function lineRange(anchor: Anchor): string {
  return anchor.firstLine === anchor.lastLine
    ? String(anchor.firstLine)
    : `${anchor.firstLine}-${anchor.lastLine}`
}

function indented(text: string): string {
  return text.trim().split('\n').join('\n    ')
}

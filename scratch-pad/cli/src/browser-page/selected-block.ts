import { occurrenceAfter } from './text-highlights'
import { visibleTextOf } from './visible-text'

export interface BlockSelection {
  readonly lines: string
  readonly firstLine: number
  readonly lastLine: number
  readonly selectedText: string
  readonly prefix: string
  readonly suffix: string
  readonly occurrence: number
}

export interface SelectedBlockText extends BlockSelection {
  readonly top: number
  readonly centre: number
}

const linesPattern = /^(\d+)-(\d+)$/
const contextLength = 32

function normalisedText(text: string): string {
  return text.replaceAll(/\s+/g, ' ').trim()
}

interface TextBesides {
  readonly prefix: string
  readonly suffix: string
  readonly occurrence: number
}

function contextBefore(textBefore: string): string {
  return [...normalisedText(textBefore)].slice(-contextLength).join('').trimStart()
}

function contextAfter(textAfter: string): string {
  return [...normalisedText(textAfter)].slice(0, contextLength).join('').trimEnd()
}

function textBesides(block: Element, range: Range): TextBesides {
  const before = document.createRange()
  before.selectNodeContents(block)
  before.setEnd(range.startContainer, range.startOffset)
  const after = document.createRange()
  after.selectNodeContents(block)
  after.setStart(range.endContainer, range.endOffset)
  return {
    prefix: contextBefore(visibleTextOf(block, before)),
    suffix: contextAfter(visibleTextOf(block, after)),
    occurrence: occurrenceAfter(before.toString(), range.toString()),
  }
}

function blockOf(node: Node, pageText: Element): Element | undefined {
  return [...pageText.children].find((child) => child.contains(node))
}

function isInsideField(node: Node): boolean {
  const element = node instanceof Element ? node : node.parentElement
  return element?.closest('button, textarea, input') !== null
}

export function selectedBlockText(
  selection: Selection | null,
  pageText: Element | null,
): SelectedBlockText | undefined {
  if (selection === null || pageText === null || selection.isCollapsed) {
    return undefined
  }
  const range = selection.getRangeAt(0)
  const block = blockOf(range.startContainer, pageText)
  const lines = linesPattern.exec(String(block?.getAttribute('data-lines')))
  const sameBlock = block !== undefined && blockOf(range.endContainer, pageText) === block
  if (lines === null || !sameBlock || isInsideField(range.startContainer)) {
    return undefined
  }
  const selectedText = normalisedText(visibleTextOf(block, range))
  if (selectedText === '') {
    return undefined
  }
  const rect = range.getBoundingClientRect()
  return {
    lines: lines[0],
    firstLine: Number(lines[1]),
    lastLine: Number(lines[2]),
    selectedText,
    ...textBesides(block, range),
    top: rect.top + window.scrollY,
    centre: rect.left + rect.width / 2 + window.scrollX,
  }
}

export function wholeBlockSelection(lines: string): BlockSelection | undefined {
  const found = linesPattern.exec(lines)
  return found === null
    ? undefined
    : {
        lines,
        firstLine: Number(found[1]),
        lastLine: Number(found[2]),
        selectedText: '',
        prefix: '',
        suffix: '',
        occurrence: 0,
      }
}

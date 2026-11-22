import { type Thread } from './api-responses'
import { type TextHighlight } from './text-highlights'

export type AnchoredText = Pick<TextHighlight, 'blockLines' | 'selectedText' | 'occurrence'>

// A thread or a queued comment, which both have an anchor and the position that the server found
type Anchored = Pick<Thread, 'anchor' | 'position'>

export interface PlacedThread<T extends Anchored = Thread> {
  readonly thread: T
  readonly blockLines: string | undefined
  readonly highlight: AnchoredText | undefined
  readonly textChanged: boolean
  readonly order: number
}

interface PageBlock {
  readonly lines: string
  readonly firstLine: number
}

const linesPattern = /^(\d+)-\d+$/

function pageBlocksOf(body: Element): PageBlock[] {
  return [...body.children].flatMap((element) => {
    const lines = String(element.getAttribute('data-lines'))
    const first = linesPattern.exec(lines)?.[1]
    return first === undefined ? [] : [{ lines, firstLine: Number(first) }]
  })
}

function placedNear<T extends Anchored>(
  thread: T,
  blocks: readonly PageBlock[],
  line: number,
  textChanged: boolean,
): PlacedThread<T> {
  const nearest = blocks.findLast((block) => block.firstLine <= line) ?? blocks[0]
  return {
    thread,
    blockLines: nearest?.lines,
    highlight: undefined,
    textChanged,
    order: nearest === undefined ? -1 : blocks.indexOf(nearest),
  }
}

function placedThread<T extends Anchored>(
  blocks: readonly PageBlock[],
  thread: T,
): PlacedThread<T> {
  const { anchor, position } = thread
  if (anchor === undefined || position === undefined) {
    return { thread, blockLines: undefined, highlight: undefined, textChanged: false, order: -1 }
  }
  if (position.kind === 'detached') {
    return placedNear(thread, blocks, anchor.firstLine, true)
  }
  const lines = `${position.firstLine}-${position.lastLine}`
  const order = blocks.findIndex((block) => block.lines === lines)
  if (order === -1) {
    return placedNear(thread, blocks, position.firstLine, false)
  }
  const highlight = {
    blockLines: lines,
    selectedText: position.text,
    occurrence: position.occurrence,
  }
  return { thread, blockLines: lines, highlight, textChanged: false, order }
}

export function placeThreads<T extends Anchored>(
  body: Element,
  threads: readonly T[],
): PlacedThread<T>[] {
  const blocks = pageBlocksOf(body)
  return threads
    .map((thread) => placedThread(blocks, thread))
    .toSorted((first, second) => first.order - second.order)
}

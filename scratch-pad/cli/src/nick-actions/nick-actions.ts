import {
  answerDecision,
  loggedAnswerLine,
  type DecisionAnswer,
  type NewDecisionAnswer,
} from '../decisions/decision-answer'
import { logDecision } from '../decisions/decision-log'
import { nextItemId } from '../items/item-id'
import { findPage } from '../pages/page-markdown'
import { pageBlocksOf } from '../rendered-page/page-blocks'
import { ScratchPadError } from '../scratch-pad-error'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { copiesOnPage } from '../threads/thread-position'
import {
  addNickMessage,
  openThread,
  resolveThread,
  type Anchor,
  type Thread,
  type ThreadType,
} from '../threads/thread'

interface NickComment {
  readonly type: ThreadType
  readonly page: string
  readonly anchor: Anchor | undefined
  readonly text: string
}

export class AnchorOutsidePageError extends ScratchPadError {
  constructor(anchor: Anchor, page: string, lineCount: number) {
    super(
      `Lines ${anchor.firstLine}-${anchor.lastLine} aren't in ${page}, which has ${lineCount} lines. Reload the page and select the text again.`,
    )
  }
}

export class UnknownBlockError extends ScratchPadError {
  constructor(anchor: Anchor, page: string) {
    super(
      `There isn't any block on lines ${anchor.firstLine}-${anchor.lastLine} of ${page}. Reload the page and comment on the block again.`,
    )
  }
}

function wholeBlockAnchor(anchor: Anchor, markdown: string, page: string): Anchor {
  const block = pageBlocksOf(markdown).find(
    (each) => each.firstLine === anchor.firstLine && each.lastLine === anchor.lastLine,
  )
  if (block === undefined) {
    throw new UnknownBlockError(anchor, page)
  }
  return { ...anchor, selectedText: block.text }
}

function checkedAnchor(anchor: Anchor | undefined, page: string, markdown: string) {
  const lineCount = markdown.trimEnd().split('\n').length
  if (anchor !== undefined && anchor.lastLine > lineCount) {
    throw new AnchorOutsidePageError(anchor, page, lineCount)
  }
  const checked = anchor?.selectedText === '' ? wholeBlockAnchor(anchor, markdown, page) : anchor
  return checked === undefined
    ? undefined
    : { ...checked, copiesOnPage: copiesOnPage(checked.selectedText, markdown) }
}

export function nickComments(folder: ScratchPadFolder, comment: NickComment): Thread {
  const time = new Date().toISOString()
  const page = findPage(folder.pages(), comment.page, folder.name)
  const anchor = checkedAnchor(comment.anchor, page, folder.readPageLines(page).join('\n'))
  return folder.change((pad) => {
    const id = nextItemId(
      comment.type,
      pad.readThreads().map((thread) => thread.id),
    )
    const thread = openThread({ ...comment, anchor, id, page, time })
    pad.writeThread(thread)
    pad.appendEvent({ time, kind: 'thread-opened', by: 'nick', item: id })
    return thread
  })
}

export function nickReplies(folder: ScratchPadFolder, id: string, text: string): Thread {
  const time = new Date().toISOString()
  return folder.change((pad) => {
    const thread = addNickMessage(pad.readThread(id), text, time)
    pad.writeThread(thread)
    pad.appendEvent({ time, kind: 'thread-replied', by: 'nick', item: id })
    return thread
  })
}

export function nickResolves(folder: ScratchPadFolder, id: string): Thread {
  const time = new Date().toISOString()
  return folder.change((pad) => {
    const thread = resolveThread(pad.readThread(id))
    pad.writeThread(thread)
    pad.appendEvent({ time, kind: 'thread-resolved', by: 'nick', item: id })
    return thread
  })
}

export function nickAnswersDecision(
  folder: ScratchPadFolder,
  input: NewDecisionAnswer,
  chosenOption?: string,
): DecisionAnswer {
  const time = new Date().toISOString()
  const page = findPage(folder.pages(), input.page, folder.name)
  return folder.change((pad) => {
    const decision = answerDecision({ ...input, page }, time)
    pad.writeDecisionAnswer(decision)
    const logged = logDecision(pad.readDecisionLog(), {
      time,
      source: 'page',
      text: `${input.question} ${loggedAnswerLine(input.answer, chosenOption)}`,
      decision: decision.id,
    })
    pad.saveDecisionLogEntry(logged.entry)
    pad.appendEvent({ time, kind: 'decision-answered', by: 'nick', item: decision.id })
    return decision
  })
}

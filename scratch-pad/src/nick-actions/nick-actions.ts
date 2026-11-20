import {
  answerDecision,
  answerLine,
  type DecisionAnswer,
  type NewDecisionAnswer,
} from '../decisions/decision-answer'
import { logDecision } from '../decisions/decision-log'
import { nextEvent, type NewEvent } from '../events/scratch-pad-event'
import { nextItemId } from '../items/item-id'
import { findPage } from '../pages/page-markdown'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
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

export function nickComments(folder: ScratchPadFolder, comment: NickComment): Thread {
  const time = new Date().toISOString()
  const page = findPage(folder.pages(), comment.page, folder.name)
  const id = nextItemId(
    comment.type,
    folder.readThreads().map((thread) => thread.id),
  )
  const thread = openThread({ ...comment, id, page, time })
  folder.writeThread(thread)
  appendEvent(folder, { time, kind: 'thread-opened', by: 'nick', item: id })
  return thread
}

export function nickReplies(folder: ScratchPadFolder, id: string, text: string): Thread {
  const time = new Date().toISOString()
  const thread = addNickMessage(folder.readThread(id), text, time)
  folder.writeThread(thread)
  appendEvent(folder, { time, kind: 'thread-replied', by: 'nick', item: id })
  return thread
}

export function nickResolves(folder: ScratchPadFolder, id: string): Thread {
  const thread = resolveThread(folder.readThread(id))
  folder.writeThread(thread)
  appendEvent(folder, {
    time: new Date().toISOString(),
    kind: 'thread-resolved',
    by: 'nick',
    item: id,
  })
  return thread
}

export function nickAnswersDecision(
  folder: ScratchPadFolder,
  input: NewDecisionAnswer,
): DecisionAnswer {
  const time = new Date().toISOString()
  const page = findPage(folder.pages(), input.page, folder.name)
  const answers = folder.readDecisionAnswers()
  const earlierAnswer = answers.find(
    (answer) => answer.page === page && answer.question === input.question,
  )
  const id =
    earlierAnswer?.id ??
    nextItemId(
      'decision',
      answers.map((answer) => answer.id),
    )
  const decision = answerDecision(id, { ...input, page }, time)
  folder.writeDecisionAnswer(decision)
  const logged = logDecision(folder.readDecisionLog(), {
    time,
    source: 'page',
    text: `${input.question} ${answerLine(input.answer)}`,
    decision: id,
  })
  folder.writeDecisionLog(logged.log)
  appendEvent(folder, { time, kind: 'decision-answered', by: 'nick', item: id })
  return decision
}

function appendEvent(folder: ScratchPadFolder, event: NewEvent): void {
  folder.appendEvent(nextEvent(folder.readEvents(), event))
}

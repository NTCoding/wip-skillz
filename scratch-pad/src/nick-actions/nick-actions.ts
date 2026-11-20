import {
  answerDecision,
  answerLine,
  type DecisionAnswer,
  type NewDecisionAnswer,
} from '../decisions/decision-answer'
import { logDecision } from '../decisions/decision-log'
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
  return folder.change((pad) => {
    const id = nextItemId(
      comment.type,
      pad.readThreads().map((thread) => thread.id),
    )
    const thread = openThread({ ...comment, id, page, time })
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
): DecisionAnswer {
  const time = new Date().toISOString()
  const page = findPage(folder.pages(), input.page, folder.name)
  return folder.change((pad) => {
    const answers = pad.readDecisionAnswers()
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
    pad.writeDecisionAnswer(decision)
    const logged = logDecision(pad.readDecisionLog(), {
      time,
      source: 'page',
      text: `${input.question} ${answerLine(input.answer)}`,
      decision: id,
    })
    pad.saveDecisionLogEntry(logged.entry)
    pad.appendEvent({ time, kind: 'decision-answered', by: 'nick', item: id })
    return decision
  })
}

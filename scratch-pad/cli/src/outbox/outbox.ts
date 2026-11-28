import { answerDecision, type Answer, type NewDecisionAnswer } from '../decisions/decision-answer'
import { ScratchPadError } from '../scratch-pad-error'
import {
  checkMessageText,
  requiredAnchor,
  type Anchor,
  type Thread,
  type ThreadType,
} from '../threads/thread'

// Nick adds a comment, a reply or a decision to the outbox when he works in draft mode and wants
// to send them later together. The agent never sees an item in the outbox until Nick sends the
// outbox.
export interface QueuedComment {
  readonly kind: 'comment'
  readonly number: number
  readonly page: string
  readonly anchor: Anchor
  readonly text: string
  readonly time: string
}

export interface QueuedReply {
  readonly kind: 'reply'
  readonly number: number
  readonly thread: string
  readonly text: string
  readonly time: string
}

export interface QueuedDecision {
  readonly kind: 'decision'
  readonly number: number
  readonly decision: string
  readonly page: string
  readonly line: number
  readonly question: string
  readonly answer: Answer
  readonly chosenOption?: string | undefined
  readonly time: string
}

export type QueuedItem = QueuedComment | QueuedReply | QueuedDecision

export type NewQueuedItem =
  Omit<QueuedComment, 'number'> | Omit<QueuedReply, 'number'> | Omit<QueuedDecision, 'number'>

interface NewQueuedComment {
  readonly type: ThreadType
  readonly page: string
  readonly anchor: Anchor | undefined
  readonly text: string
  readonly time: string
}

export class NotQueueableError extends ScratchPadError {
  constructor(what: string) {
    super(
      `Only a comment or a reply to a comment can be added to the outbox, so ${what} is sent straight away.`,
    )
  }
}

export class UnknownQueuedItemError extends ScratchPadError {
  constructor(number: number) {
    super(
      `There isn't any item ${number} in the outbox. It might have been sent or removed already, so reload the page.`,
    )
  }
}

export function queueComment(comment: NewQueuedComment): NewQueuedItem {
  if (comment.type !== 'comment') {
    throw new NotQueueableError(`a ${comment.type} note`)
  }
  return {
    kind: 'comment',
    page: comment.page,
    anchor: requiredAnchor(comment.type, comment.anchor),
    text: checkMessageText(comment.text),
    time: comment.time,
  }
}

export function queueReply(thread: Thread, text: string, time: string): NewQueuedItem {
  if (thread.type !== 'comment') {
    throw new NotQueueableError(`a reply to ${thread.id}`)
  }
  return { kind: 'reply', thread: thread.id, text: checkMessageText(text), time }
}

export function queueDecision(
  input: NewDecisionAnswer,
  time: string,
  chosenOption?: string,
): NewQueuedItem {
  const checked = answerDecision(input, time)
  return {
    kind: 'decision',
    decision: checked.id,
    page: checked.page,
    line: checked.line,
    question: checked.question,
    answer: checked.answer,
    ...(chosenOption === undefined ? {} : { chosenOption }),
    time,
  }
}

export function findQueuedItem(items: readonly QueuedItem[], number: number): QueuedItem {
  const item = items.find((each) => each.number === number)
  if (item === undefined) {
    throw new UnknownQueuedItemError(number)
  }
  return item
}

export function editQueuedItem(
  items: readonly QueuedItem[],
  number: number,
  text: string,
): QueuedComment | QueuedReply {
  const item = findQueuedItem(items, number)
  if (item.kind === 'decision') {
    throw new NotQueueableError(`editing decision ${item.decision}`)
  }
  return { ...item, text: checkMessageText(text) }
}

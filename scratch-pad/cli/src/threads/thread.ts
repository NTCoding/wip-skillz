import { ScratchPadError } from '../scratch-pad-error'
import { itemTypeNoun } from '../items/item-id'

export const threadTypes = ['comment', 'grammar', 'improvement'] as const
export type ThreadType = (typeof threadTypes)[number]

export const authors = ['nick', 'agent'] as const
export type Author = (typeof authors)[number]

export const waitingParties = ['nick', 'agent', 'nobody'] as const
export type WaitingParty = (typeof waitingParties)[number]

export interface Anchor {
  readonly firstLine: number
  readonly lastLine: number
  readonly selectedText: string
  readonly prefix: string | undefined
  readonly suffix: string | undefined
  readonly copiesOnPage?: number
}

export interface Message {
  readonly author: Author
  readonly text: string
  readonly time: string
}

interface ThreadFields {
  readonly id: string
  readonly type: ThreadType
  readonly anchor: Anchor | undefined
  readonly waitsFor: WaitingParty
  readonly outcome: string | undefined
  readonly messages: readonly [Message, ...Message[]]
}

export interface PageThread extends ThreadFields {
  readonly page: string
  readonly task?: undefined
}

// A thread that Nick starts on a task or a subtask that is assigned to him. It's always a comment.
// It doesn't have a page or an anchor, because it's shown on the row of the task on the progress
// tracker.
export interface TaskThread extends ThreadFields {
  readonly type: 'comment'
  readonly anchor: undefined
  readonly page: undefined
  // The id of the task or the subtask, like t-4
  readonly task: string
}

export type Thread = PageThread | TaskThread

interface NewThread {
  readonly id: string
  readonly type: ThreadType
  readonly page: string
  readonly anchor: Anchor | undefined
  readonly text: string
  readonly time: string
}

export class MissingAnchorError extends ScratchPadError {
  constructor(type: ThreadType) {
    super(
      `A ${itemTypeNoun(type)} needs an anchor with the first line, the last line and the selected text.`,
    )
  }
}

export class InvalidAnchorError extends ScratchPadError {
  constructor(anchor: Anchor) {
    super(
      `The anchor ${anchor.firstLine}-${anchor.lastLine} is invalid. The first line must be 1 or more and the last line can't be before the first line.`,
    )
  }
}

export class EmptyMessageError extends ScratchPadError {
  constructor() {
    super('The message is empty. Write the text of the message.')
  }
}

export class ClosedThreadError extends ScratchPadError {
  constructor(id: string) {
    super(
      `${id} is closed so the agent can't reply to it or mark it as done. Nick can reopen it with a reply on its card in the browser.`,
    )
  }
}

export class NotANoteError extends ScratchPadError {
  constructor(id: string) {
    super(
      `${id} is a comment. Only a grammar note or an improvement note can be done. Reply to ${id} with the reply command instead.`,
    )
  }
}

export class EmptyOutcomeError extends ScratchPadError {
  constructor() {
    super('The outcome is empty. Write one line about what was changed.')
  }
}

export function openThread(newThread: NewThread): PageThread {
  checkAnchor(newThread.type, newThread.anchor)
  return {
    id: newThread.id,
    type: newThread.type,
    page: newThread.page,
    anchor: newThread.anchor,
    waitsFor: 'agent',
    outcome: undefined,
    messages: [message('nick', newThread.text, newThread.time)],
  }
}

interface NewTaskThread {
  readonly id: string
  readonly task: string
  readonly text: string
  readonly time: string
}

// Only Nick starts the thread of a task. The thread then waits for the agent.
export function openTaskThread(newThread: NewTaskThread): TaskThread {
  return {
    id: newThread.id,
    type: 'comment',
    page: undefined,
    task: newThread.task,
    anchor: undefined,
    waitsFor: 'agent',
    outcome: undefined,
    messages: [message('nick', newThread.text, newThread.time)],
  }
}

export function addNickMessage(thread: Thread, text: string, time: string): Thread {
  return {
    ...thread,
    waitsFor: 'agent',
    outcome: undefined,
    messages: [...thread.messages, message('nick', text, time)],
  }
}

export function addAgentMessage(thread: Thread, text: string, time: string): Thread {
  if (thread.waitsFor === 'nobody') {
    throw new ClosedThreadError(thread.id)
  }
  return {
    ...thread,
    waitsFor: 'nick',
    messages: [...thread.messages, message('agent', text, time)],
  }
}

export function resolveThread(thread: Thread): Thread {
  return { ...thread, waitsFor: 'nobody' }
}

// A note is always on a page. A thread on a task is a comment.
export function finishNote(thread: Thread, outcome: string): PageThread {
  if (thread.type === 'comment') {
    throw new NotANoteError(thread.id)
  }
  if (thread.waitsFor === 'nobody') {
    throw new ClosedThreadError(thread.id)
  }
  const line = outcome.trim()
  if (line === '') {
    throw new EmptyOutcomeError()
  }
  return { ...thread, waitsFor: 'nobody', outcome: line }
}

export function lastMessage(thread: Thread): Message {
  const [first, ...rest] = thread.messages
  return rest.at(-1) ?? first
}

export function messagesSinceAgentReply(thread: Thread): readonly Message[] {
  const lastAgentMessage = thread.messages.findLastIndex((entry) => entry.author === 'agent')
  return thread.messages.slice(lastAgentMessage + 1)
}

function checkAnchor(type: ThreadType, anchor: Anchor | undefined): void {
  if (anchor !== undefined || type !== 'improvement') {
    requiredAnchor(type, anchor)
  }
}

// Returns the anchor of a comment or a grammar note, which always needs one.
export function requiredAnchor(type: ThreadType, anchor: Anchor | undefined): Anchor {
  if (anchor === undefined) {
    throw new MissingAnchorError(type)
  }
  if (anchor.firstLine < 1 || anchor.lastLine < anchor.firstLine) {
    throw new InvalidAnchorError(anchor)
  }
  return anchor
}

export function checkMessageText(text: string): string {
  if (text.trim() === '') {
    throw new EmptyMessageError()
  }
  return text
}

function message(author: Author, text: string, time: string): Message {
  return { author, text: checkMessageText(text), time }
}

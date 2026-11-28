import {
  answerDecision,
  loggedAnswerLine,
  type DecisionAnswer,
  type NewDecisionAnswer,
} from '../decisions/decision-answer'
import { logDecision } from '../decisions/decision-log'
import {
  assertCanBeDecided,
  DecisionAlreadyAnsweredError,
  requestChanges,
  type DecisionReview,
  type NewDecisionReview,
} from '../decisions/decision-review'
import {
  editImprovement,
  findImprovement,
  type Improvement,
  type ImprovementEdit,
} from '../improvements/improvements'
import { nextItemId } from '../items/item-id'
import {
  editQueuedItem,
  findQueuedItem,
  queueComment,
  queueDecision,
  queueReply,
  type QueuedComment,
  type QueuedItem,
  type QueuedReply,
} from '../outbox/outbox'
import { findPage } from '../pages/page-markdown'
import {
  isSubtask,
  itemNameFirst,
  itemWithId,
  type ProgressTracker,
  type Subtask,
  type SubtaskNumber,
  type Task,
  type TrackerItem,
} from '../progress-tracker/progress-tracker'
import { finishSubtask, finishTask } from '../progress-tracker/task-progress'
import { findSection, sectionTexts, type SectionHash } from '../read-marks/read-marks'
import { pageBlocksOf } from '../rendered-page/page-blocks'
import { ScratchPadError } from '../scratch-pad-error'
import { type PadDb } from '../scratch-pad-folder/pad-db'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { startTaskThread } from '../threads/task-thread'
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

// Nick can only mark the tasks that are assigned to him as done. The agent marks every other task
// as done.
export class UnassignedTaskDoneError extends ScratchPadError {
  constructor(item: TrackerItem) {
    super(`${itemNameFirst(item)} isn't assigned to you so only the agent can mark it as done.`)
  }
}

// The Inbox can still show the button of a task that the agent has split into subtasks since the
// Inbox was loaded. The state of that task follows its subtasks now.
export class SplitTaskDoneError extends ScratchPadError {
  constructor(task: Task) {
    super(
      `The agent has split task ${task.number} into subtasks and will tell you which of them are yours.`,
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
  return folder.change((pad) => writeNickComment(pad, { ...comment, anchor, page }, time))
}

// Nick starts the thread of a task or a subtask that is assigned to him from its row on the
// progress tracker.
export function nickCommentsOnTask(folder: ScratchPadFolder, task: string, text: string): Thread {
  const time = new Date().toISOString()
  return folder.change((pad) => {
    const thread = startTaskThread(pad.readThreads(), pad.readProgressTracker(), {
      task,
      text,
      time,
    })
    pad.writeThread(thread)
    pad.appendEvent({ time, kind: 'thread-opened', by: 'nick', item: thread.id })
    return thread
  })
}

export function nickReplies(folder: ScratchPadFolder, id: string, text: string): Thread {
  const time = new Date().toISOString()
  return folder.change((pad) => writeNickReply(pad, id, text, time))
}

function writeNickComment(pad: PadDb, comment: NickComment, time: string): Thread {
  const id = nextItemId(
    comment.type,
    pad.readThreads().map((thread) => thread.id),
  )
  const thread = openThread({ ...comment, id, time })
  pad.writeThread(thread)
  pad.appendEvent({ time, kind: 'thread-opened', by: 'nick', item: id })
  return thread
}

function writeNickReply(pad: PadDb, id: string, text: string, time: string): Thread {
  const thread = addNickMessage(pad.readThread(id), text, time)
  pad.writeThread(thread)
  pad.appendEvent({ time, kind: 'thread-replied', by: 'nick', item: id })
  return thread
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

function writeNickDecisionAnswer(
  pad: PadDb,
  input: NewDecisionAnswer,
  time: string,
  chosenOption?: string,
): DecisionAnswer {
  assertCanBeDecided(input.id, pad.readDecisionRounds(input.id))
  const decision = answerDecision(input, time)
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
}

export function nickAnswersDecision(
  folder: ScratchPadFolder,
  input: NewDecisionAnswer,
  chosenOption?: string,
): DecisionAnswer {
  const time = new Date().toISOString()
  const page = findPage(folder.pages(), input.page, folder.name)
  return folder.change((pad) =>
    writeNickDecisionAnswer(pad, { ...input, page }, time, chosenOption),
  )
}

export function nickRequestsChanges(
  folder: ScratchPadFolder,
  input: NewDecisionReview,
): DecisionReview {
  const time = new Date().toISOString()
  const page = findPage(folder.pages(), input.page, folder.name)
  return folder.change((pad) => {
    if (pad.readDecisionAnswers().some((answer) => answer.id === input.id)) {
      throw new DecisionAlreadyAnsweredError(input.id)
    }
    const rounds = pad.readDecisionRounds(input.id)
    assertCanBeDecided(input.id, rounds)
    const review = requestChanges({ ...input, page }, rounds, time)
    pad.writeDecisionReview(review)
    pad.appendEvent({ time, kind: 'decision-changes-requested', by: 'nick', item: review.id })
    return review
  })
}

// Nick marks a task or a subtask that is assigned to him as done in the browser. It's finished in
// the same way as with \`task done\` or \`subtask done\` so the next task is started too. The start
// is recorded straight after the task-done event so that the agent's inbox prints the task that
// was started together with Nick's task. The agent's inbox prints Nick's task once.
// A task that is already done, like after a click in another tab, is what Nick wanted. That's why
// it's returned without recording anything.
export function nickFinishesTask(folder: ScratchPadFolder, id: string): TrackerItem {
  const time = new Date().toISOString()
  return folder.change((pad) => {
    const tracker = pad.readProgressTracker()
    const item = itemNickCanFinish(tracker, id)
    if (item.state === 'done') {
      return item
    }
    const finish = isSubtask(item)
      ? finishSubtask(tracker, subtaskNumberOf(item))
      : finishTask(tracker, item.number)
    pad.writeProgressTracker(finish.tracker)
    pad.appendEvent({ time, kind: 'task-done', by: 'nick', item: id })
    if (finish.started !== undefined) {
      pad.appendEvent({ time, kind: 'task-started', by: 'nick', item: finish.started.id })
    }
    return finish.finished
  })
}

function itemNickCanFinish(tracker: ProgressTracker, id: string): TrackerItem {
  const item = itemWithId(tracker, id)
  if (item.assignment === undefined) {
    throw new UnassignedTaskDoneError(item)
  }
  if (!isSubtask(item) && item.subtasks.length > 0) {
    throw new SplitTaskDoneError(item)
  }
  return item
}

// The number of a subtask, like 2.1, is made of the number of its task and the position of the
// subtask in that task.
function subtaskNumberOf(subtask: Subtask): SubtaskNumber {
  const [task, position] = subtask.number.split('.')
  return { task: Number(task), subtask: Number(position) }
}

export function nickEditsImprovement(
  folder: ScratchPadFolder,
  number: number,
  edit: ImprovementEdit,
): Improvement {
  const time = new Date().toISOString()
  return folder.change((pad) => {
    const improvement = editImprovement(pad.readImprovements(), number, edit)
    pad.updateImprovement(improvement)
    pad.appendEvent({ time, kind: 'improvement-edited', by: 'nick', item: undefined })
    return improvement
  })
}

export function nickDeletesImprovement(folder: ScratchPadFolder, number: number): void {
  const time = new Date().toISOString()
  folder.change((pad) => {
    pad.deleteImprovement(findImprovement(pad.readImprovements(), number).number)
    pad.appendEvent({ time, kind: 'improvement-deleted', by: 'nick', item: undefined })
  })
}

export function nickQueuesComment(folder: ScratchPadFolder, comment: NickComment): QueuedItem {
  const time = new Date().toISOString()
  const page = findPage(folder.pages(), comment.page, folder.name)
  const anchor = checkedAnchor(comment.anchor, page, folder.readPageLines(page).join('\n'))
  const queued = queueComment({ ...comment, anchor, page, time })
  return folder.change((pad) => {
    const item = pad.saveQueuedItem(queued)
    pad.appendEvent({ time, kind: 'item-queued', by: 'nick', item: undefined })
    return item
  })
}

export function nickQueuesReply(folder: ScratchPadFolder, id: string, text: string): QueuedItem {
  const time = new Date().toISOString()
  return folder.change((pad) => {
    const item = pad.saveQueuedItem(queueReply(pad.readThread(id), text, time))
    pad.appendEvent({ time, kind: 'item-queued', by: 'nick', item: undefined })
    return item
  })
}

export function nickQueuesDecision(
  folder: ScratchPadFolder,
  input: NewDecisionAnswer,
  chosenOption?: string,
): QueuedItem {
  const time = new Date().toISOString()
  const page = findPage(folder.pages(), input.page, folder.name)
  return folder.change((pad) => {
    if (pad.readDecisionAnswers().some((answer) => answer.id === input.id)) {
      throw new DecisionAlreadyAnsweredError(input.id)
    }
    assertCanBeDecided(input.id, pad.readDecisionRounds(input.id))
    const queued = queueDecision({ ...input, page }, time, chosenOption)
    pad
      .readOutbox()
      .filter((existing) => existing.kind === 'decision' && existing.decision === input.id)
      .forEach((existing) => pad.deleteQueuedItem(existing.number))
    const item = pad.saveQueuedItem(queued)
    pad.appendEvent({ time, kind: 'item-queued', by: 'nick', item: undefined })
    return item
  })
}

export function nickEditsQueuedItem(
  folder: ScratchPadFolder,
  number: number,
  text: string,
): QueuedComment | QueuedReply {
  const time = new Date().toISOString()
  return folder.change((pad) => {
    const item = editQueuedItem(pad.readOutbox(), number, text)
    pad.updateQueuedItem(item)
    pad.appendEvent({ time, kind: 'queued-item-edited', by: 'nick', item: undefined })
    return item
  })
}

export function nickRemovesQueuedItem(folder: ScratchPadFolder, number: number): void {
  const time = new Date().toISOString()
  folder.change((pad) => {
    pad.deleteQueuedItem(findQueuedItem(pad.readOutbox(), number).number)
    pad.appendEvent({ time, kind: 'queued-item-removed', by: 'nick', item: undefined })
  })
}

// Each item is sent in the order it was queued, with the time of the send, so the agent sees it as
// if Nick had sent it on its own at that moment.
export function nickSendsOutbox(folder: ScratchPadFolder): Thread[] {
  const time = new Date().toISOString()
  return folder.change((pad) => {
    const items = pad.readOutbox()
    const sent: Thread[] = []
    for (const item of items) {
      const thread = sendQueuedItem(pad, item, time)
      if (thread !== undefined) {
        sent.push(thread)
      }
    }
    items.forEach((item) => pad.deleteQueuedItem(item.number))
    if (items.length > 0) {
      pad.appendEvent({ time, kind: 'outbox-sent', by: 'nick', item: undefined })
    }
    return sent.filter(
      (thread, index) => !sent.slice(index + 1).some((later) => later.id === thread.id),
    )
  })
}

function sendQueuedItem(pad: PadDb, item: QueuedItem, time: string): Thread | undefined {
  if (item.kind === 'decision') {
    const { decision: id, page, line, question, answer, chosenOption } = item
    writeNickDecisionAnswer(pad, { id, page, line, question, answer }, time, chosenOption)
    return undefined
  }
  return item.kind === 'reply'
    ? writeNickReply(pad, item.thread, item.text, time)
    : writeNickComment(
        pad,
        { type: 'comment', page: item.page, anchor: item.anchor, text: item.text },
        time,
      )
}

function sectionsOfPage(folder: ScratchPadFolder, page: string) {
  return sectionTexts(folder.readPageLines(page).join('\n'), page)
}

// Marking a page as read also marks each section as read with the hash that the browser showed
// Nick. If the agent saves the page after the browser showed it, the hash of a changed section
// will differ from the stored one and a new section won't have a stored hash, so both will show as
// changed. A hash of a section that isn't on the page any more isn't stored.
export function nickMarksPageRead(
  folder: ScratchPadFolder,
  requested: string,
  shown: readonly SectionHash[],
): void {
  const time = new Date().toISOString()
  const page = findPage(folder.pages(), requested, folder.name)
  const onThePage = new Set(sectionsOfPage(folder, page).map((section) => section.id))
  const sections = shown.filter((section) => onThePage.has(section.id))
  folder.change((pad) => {
    pad.markPageRead(page, sections)
    pad.appendEvent({ time, kind: 'page-read', by: 'nick', item: undefined })
  })
}

export function nickMarksPageUnread(folder: ScratchPadFolder, requested: string): void {
  const time = new Date().toISOString()
  const page = findPage(folder.pages(), requested, folder.name)
  folder.change((pad) => {
    pad.markPageUnread(page)
    pad.appendEvent({ time, kind: 'page-unread', by: 'nick', item: undefined })
  })
}

// The hash is the one that the browser showed Nick, so a text that the agent saved after that will
// still show as changed.
export function nickMarksSectionRead(
  folder: ScratchPadFolder,
  requested: string,
  shown: SectionHash,
): void {
  const time = new Date().toISOString()
  const page = findPage(folder.pages(), requested, folder.name)
  findSection(sectionsOfPage(folder, page), shown.id, page)
  folder.change((pad) => {
    pad.markSectionRead(page, shown)
    pad.appendEvent({ time, kind: 'section-read', by: 'nick', item: undefined })
  })
}

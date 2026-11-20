import { decisionShowLines } from '../decisions/decision-text'
import { nextEvent } from '../events/scratch-pad-event'
import { itemTypeOf } from '../items/item-id'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { ScratchPadError } from '../scratch-pad-error'
import { addAgentMessage, finishNote } from '../threads/thread'
import { threadShowLines } from '../threads/thread-text'

export class DecisionReplyError extends ScratchPadError {
  constructor(id: string) {
    super(`${id} is a decision. Only a thread can be replied to or be done.`)
  }
}

export function showItem(folder: ScratchPadFolder, id: string): string {
  if (itemTypeOf(id) === 'decision') {
    return decisionShowLines(folder.readDecisionAnswer(id)).join('\n')
  }
  const thread = folder.readThread(id)
  return threadShowLines(thread, folder.readPageLines(thread.page)).join('\n')
}

export function replyToThread(folder: ScratchPadFolder, id: string, text: string): string {
  const time = new Date().toISOString()
  folder.writeThread(addAgentMessage(readThreadToChange(folder, id), text, time))
  folder.appendEvent(
    nextEvent(folder.readEvents(), { time, kind: 'thread-replied', by: 'agent', item: id }),
  )
  return `${id} now waits for Nick`
}

export function finishNoteThread(folder: ScratchPadFolder, id: string, outcome: string): string {
  const time = new Date().toISOString()
  folder.writeThread(finishNote(readThreadToChange(folder, id), outcome))
  folder.appendEvent(
    nextEvent(folder.readEvents(), { time, kind: 'note-done', by: 'agent', item: id }),
  )
  return `${id} is done`
}

function readThreadToChange(folder: ScratchPadFolder, id: string) {
  if (itemTypeOf(id) === 'decision') {
    throw new DecisionReplyError(id)
  }
  return folder.readThread(id)
}

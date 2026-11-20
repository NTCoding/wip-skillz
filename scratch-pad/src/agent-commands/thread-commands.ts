import { decisionShowLines } from '../decisions/decision-text'
import { itemTypeOf } from '../items/item-id'
import { type PadDb } from '../scratch-pad-folder/pad-db'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { ScratchPadError } from '../scratch-pad-error'
import { addAgentMessage, finishNote, type Thread } from '../threads/thread'
import { threadShowLines } from '../threads/thread-text'

export class DecisionReplyError extends ScratchPadError {
  constructor(id: string) {
    super(`${id} is a decision. Only a thread can be replied to or be done.`)
  }
}

export function showItem(folder: ScratchPadFolder, id: string): string {
  if (itemTypeOf(id) === 'decision') {
    return decisionShowLines(folder.read((pad) => pad.readDecisionAnswer(id))).join('\n')
  }
  const thread = folder.read((pad) => pad.readThread(id))
  return threadShowLines(thread, folder.readPageLines(thread.page)).join('\n')
}

export function replyToThread(folder: ScratchPadFolder, id: string, text: string): string {
  const time = new Date().toISOString()
  folder.change((pad) => {
    pad.writeThread(addAgentMessage(readThreadToChange(pad, id), text, time))
    pad.appendEvent({ time, kind: 'thread-replied', by: 'agent', item: id })
  })
  return `${id} now waits for Nick`
}

export function finishNoteThread(folder: ScratchPadFolder, id: string, outcome: string): string {
  const time = new Date().toISOString()
  folder.change((pad) => {
    pad.writeThread(finishNote(readThreadToChange(pad, id), outcome))
    pad.appendEvent({ time, kind: 'note-done', by: 'agent', item: id })
  })
  return `${id} is done`
}

function readThreadToChange(pad: PadDb, id: string): Thread {
  if (itemTypeOf(id) === 'decision') {
    throw new DecisionReplyError(id)
  }
  return pad.readThread(id)
}

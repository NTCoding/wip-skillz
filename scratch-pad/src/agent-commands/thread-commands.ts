import { followDecision } from '../decisions/decision-answer'
import { decisionShowLines } from '../decisions/decision-text'
import { itemTypeOf } from '../items/item-id'
import { type PadDb } from '../scratch-pad-folder/pad-db'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { ScratchPadError } from '../scratch-pad-error'
import { addAgentMessage, finishNote, type Thread } from '../threads/thread'
import { threadShowLines } from '../threads/thread-text'

export class DecisionReplyError extends ScratchPadError {
  constructor(id: string) {
    super(
      `${id} is a decision, which can't be replied to. Change the page so that it follows Nick's answer. Then mark ${id} as done with the done command.`,
    )
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

export function finishItem(folder: ScratchPadFolder, id: string, outcome: string): string {
  const time = new Date().toISOString()
  folder.change((pad) => {
    if (itemTypeOf(id) === 'decision') {
      pad.writeDecisionAnswer(followDecision(pad.readDecisionAnswer(id), outcome))
      pad.appendEvent({ time, kind: 'decision-followed', by: 'agent', item: id })
    } else {
      pad.writeThread(finishNote(pad.readThread(id), outcome))
      pad.appendEvent({ time, kind: 'note-done', by: 'agent', item: id })
    }
  })
  return `${id} is done`
}

function readThreadToChange(pad: PadDb, id: string): Thread {
  if (itemTypeOf(id) === 'decision') {
    throw new DecisionReplyError(id)
  }
  return pad.readThread(id)
}

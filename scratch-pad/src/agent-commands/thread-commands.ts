import { followDecision } from '../decisions/decision-answer'
import { decisionShowLines } from '../decisions/decision-text'
import { itemTypeOf } from '../items/item-id'
import { pageLink, textWithLink, withLinksNote, type ItemLinks } from '../item-links/item-links'
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

export function showItem(folder: ScratchPadFolder, id: string, links: ItemLinks): string {
  if (itemTypeOf(id) === 'decision') {
    const decision = folder.read((pad) => pad.readDecisionAnswer(id))
    return withLinksNote(links, decisionShowLines(decision, links).join('\n'))
  }
  const thread = folder.read((pad) => pad.readThread(id))
  return withLinksNote(
    links,
    threadShowLines(thread, folder.readPageLines(thread.page), links).join('\n'),
  )
}

export function replyToThread(
  folder: ScratchPadFolder,
  id: string,
  text: string,
  links: ItemLinks,
): string {
  const time = new Date().toISOString()
  const page = folder.change((pad) => {
    const thread = addAgentMessage(readThreadToChange(pad, id), text, time)
    pad.writeThread(thread)
    pad.appendEvent({ time, kind: 'thread-replied', by: 'agent', item: id })
    return thread.page
  })
  return textWithLink(links, `${id} now waits for Nick`, pageLink(links, page, id))
}

export function finishItem(
  folder: ScratchPadFolder,
  id: string,
  outcome: string,
  links: ItemLinks,
): string {
  const time = new Date().toISOString()
  const page = folder.change((pad) => {
    if (itemTypeOf(id) === 'decision') {
      const decision = followDecision(pad.readDecisionAnswer(id), outcome)
      pad.writeDecisionAnswer(decision)
      pad.appendEvent({ time, kind: 'decision-followed', by: 'agent', item: id })
      return decision.page
    }
    const thread = finishNote(pad.readThread(id), outcome)
    pad.writeThread(thread)
    pad.appendEvent({ time, kind: 'note-done', by: 'agent', item: id })
    return thread.page
  })
  return textWithLink(links, `${id} is done`, pageLink(links, page, id))
}

function readThreadToChange(pad: PadDb, id: string): Thread {
  if (itemTypeOf(id) === 'decision') {
    throw new DecisionReplyError(id)
  }
  return pad.readThread(id)
}

import { followDecision } from '../decisions/decision-answer'
import { DecisionDoneError, isSentBack, reopenDecision } from '../decisions/decision-review'
import {
  decisionReviewHistoryLines,
  decisionReviewShowLines,
  decisionShowLines,
} from '../decisions/decision-text'
import { itemTypeOf } from '../items/item-id'
import { pageLink, textWithLink, withLinksNote, type ItemLinks } from '../item-links/item-links'
import { brokenPageLinesOf } from './decision-page-commands'
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

export class ReopenNotDecisionError extends ScratchPadError {
  constructor(id: string) {
    super(`${id} isn't a decision. Only a decision with changes requested can be reopened.`)
  }
}

export function showItem(folder: ScratchPadFolder, id: string, links: ItemLinks): string {
  if (itemTypeOf(id) === 'decision') {
    return withLinksNote(links, decisionLinesOf(folder, id, links).join('\n'))
  }
  const thread = folder.read((pad) => pad.readThread(id))
  return withLinksNote(
    links,
    threadShowLines(thread, folder.readPage(thread.page), links).join('\n'),
  )
}

// A decision has the answer of Nick, its rounds of changes requested or both. The rounds of a
// reopened decision stay as history after Nick has answered the decision.
function decisionLinesOf(folder: ScratchPadFolder, id: string, links: ItemLinks): string[] {
  const { answered, rounds } = folder.read((pad) => ({
    answered: pad.readDecisionAnswers().find((decision) => decision.id === id),
    rounds: pad.readDecisionRounds(id),
  }))
  const newest = rounds.at(-1)
  if (answered === undefined && newest !== undefined) {
    return decisionReviewShowLines(newest, rounds, folder.readPage(newest.page).file, links)
  }
  const decision = folder.read((pad) => pad.readDecisionAnswer(id))
  const page = folder.readPage(decision.page)
  return [
    ...decisionShowLines(decision, page.file, links, page.lines),
    ...decisionReviewHistoryLines(rounds),
  ]
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
      if (isSentBack(pad.readDecisionRounds(id))) {
        throw new DecisionDoneError(id)
      }
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

export function reopenItem(
  folder: ScratchPadFolder,
  id: string,
  outcome: string,
  links: ItemLinks,
): string {
  if (itemTypeOf(id) !== 'decision') {
    throw new ReopenNotDecisionError(id)
  }
  const time = new Date().toISOString()
  const page = folder.change((pad) => {
    const review = reopenDecision(id, pad.readDecisionRounds(id), outcome)
    pad.writeDecisionReview(review)
    pad.appendEvent({ time, kind: 'decision-reopened', by: 'agent', item: id })
    return review.page
  })
  return [
    textWithLink(links, `${id} is open again`, pageLink(links, page, id)),
    ...brokenPageLinesOf(folder, page),
  ].join('\n')
}

function readThreadToChange(pad: PadDb, id: string): Thread {
  if (itemTypeOf(id) === 'decision') {
    throw new DecisionReplyError(id)
  }
  return pad.readThread(id)
}

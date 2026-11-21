import { logDecision } from '../decisions/decision-log'
import { decisionLogLink, textWithLink, type ItemLinks } from '../item-links/item-links'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'

export function logDecisionFromChat(
  folder: ScratchPadFolder,
  text: string,
  links: ItemLinks,
): string {
  const time = new Date().toISOString()
  const logged = folder.change((pad) => {
    const logged = logDecision(pad.readDecisionLog(), {
      time,
      source: 'chat',
      text,
      decision: undefined,
    })
    pad.saveDecisionLogEntry(logged.entry)
    pad.appendEvent({ time, kind: 'decision-logged', by: 'agent', item: undefined })
    return `decision ${logged.entry.number} is logged`
  })
  return textWithLink(links, logged, decisionLogLink(links))
}

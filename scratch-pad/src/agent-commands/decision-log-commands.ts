import { logDecision } from '../decisions/decision-log'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'

export function logDecisionFromChat(folder: ScratchPadFolder, text: string): string {
  const time = new Date().toISOString()
  return folder.change((pad) => {
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
}

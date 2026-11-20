import { logDecision } from '../decisions/decision-log'
import { nextEvent } from '../events/scratch-pad-event'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'

export function logDecisionFromChat(folder: ScratchPadFolder, text: string): string {
  const time = new Date().toISOString()
  const logged = logDecision(folder.readDecisionLog(), {
    time,
    source: 'chat',
    text,
    decision: undefined,
  })
  folder.writeDecisionLog(logged.log)
  folder.appendEvent(
    nextEvent(folder.readEvents(), { time, kind: 'decision-logged', by: 'agent', item: undefined }),
  )
  return `decision ${logged.entry.number} is logged`
}

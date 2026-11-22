import { outboxEventKinds, type ScratchPadEvent } from '../events/scratch-pad-event'

export function momentNickIsQuiet(
  events: readonly ScratchPadEvent[],
  quietMilliseconds: number,
): number {
  const lastByNick = events.findLast(
    (event) => event.by === 'nick' && !outboxEventKinds.includes(event.kind),
  )
  return lastByNick === undefined ? 0 : Date.parse(lastByNick.time) + quietMilliseconds
}

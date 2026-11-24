import { useState } from 'react'
import { type Thread } from './api-responses'

// In a wide reading column, the card of a resolved thread is hidden behind its marker so that it
// doesn't take any room in the margin. That's only the case if the thread was already resolved when
// the page showed the thread for the first time, or if Nick resolved the thread himself. So if the
// agent resolves a thread that Nick has seen open, its card will stay in the margin until Nick
// presses its Hide button or reloads the page. The Hide button calls resolvedByNick too.
export interface ResolvedThreads {
  readonly behindMarker: (thread: Thread) => boolean
  readonly resolvedByNick: (thread: Thread) => void
}

// The app stores the threads rather than the page, because PageWithThreads is a new component for
// each page that Nick opens. Nick's resolve is stored with the count of messages, because a reply
// reopens the thread. If the agent resolves the thread after that reply, the card will stay in the
// margin.
export function useResolvedThreads(threads: readonly Thread[]): ResolvedThreads {
  const [seenOpen, setSeenOpen] = useState<ReadonlySet<string>>(new Set())
  const [byNick, setByNick] = useState<ReadonlyMap<string, number>>(new Map())
  const newlyOpen = threads.filter(
    (thread) => thread.waitsFor !== 'nobody' && !seenOpen.has(thread.id),
  )
  if (newlyOpen.length > 0) {
    setSeenOpen((current) => new Set([...current, ...newlyOpen.map((thread) => thread.id)]))
  }
  return {
    behindMarker: (thread) =>
      thread.waitsFor === 'nobody' &&
      (!seenOpen.has(thread.id) || byNick.get(thread.id) === thread.messages.length),
    resolvedByNick: (thread) =>
      setByNick((current) => new Map([...current, [thread.id, thread.messages.length]])),
  }
}

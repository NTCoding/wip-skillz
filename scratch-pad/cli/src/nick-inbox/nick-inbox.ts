import { lastMessage, type Thread } from '../threads/thread'

export function nickInbox(threads: readonly Thread[]): Thread[] {
  return threads
    .filter((thread) => thread.waitsFor === 'nick')
    .toSorted((first, second) => lastMessage(first).time.localeCompare(lastMessage(second).time))
}

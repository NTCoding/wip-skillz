import { useState } from 'react'
import { problemOf } from './components/message-box/message-box'

interface PendingAction {
  readonly pending: boolean
  // The problem of the last run, which a component shows to Nick with role="alert"
  readonly problem: string | undefined
  readonly run: () => void
}

// A button that calls the server, like "Mark as read", is disabled while the request is pending.
// If the request fails, the problem will be shown below the button and the button will be enabled
// again.
export function usePendingAction(action: () => Promise<void>): PendingAction {
  const [pending, setPending] = useState(false)
  const [problem, setProblem] = useState<string | undefined>(undefined)
  const run = (): void => {
    setPending(true)
    setProblem(undefined)
    action()
      .catch((error: unknown) => setProblem(problemOf(error)))
      .finally(() => setPending(false))
  }
  return { pending, problem, run }
}

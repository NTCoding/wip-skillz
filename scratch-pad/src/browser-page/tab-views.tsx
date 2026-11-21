import { type DecisionLogEntry, type ProgressTracker } from './api-responses'
import { DecisionLog, Notice, ReadingColumn, TaskList } from './design-system/design-system'
import { type LoadedValue } from './loaded-value'

export function LoadingView({ loaded }: { readonly loaded: LoadedValue<unknown> }) {
  return (
    <ReadingColumn>
      {loaded.status === 'failed' ? (
        <Notice tone="warning">{loaded.message}</Notice>
      ) : (
        <Notice tone="info">Loading…</Notice>
      )}
    </ReadingColumn>
  )
}

export function ProgressTrackerView({ tracker }: { readonly tracker: ProgressTracker }) {
  return (
    <ReadingColumn>
      <h1>Progress tracker</h1>
      <p>
        {tracker.goal === undefined ? 'The goal hasn’t been set yet.' : `Goal: ${tracker.goal}`}
      </p>
      {tracker.tasks.length === 0 ? (
        <Notice tone="info">There aren’t any tasks yet.</Notice>
      ) : (
        <TaskList tasks={tracker.tasks} />
      )}
    </ReadingColumn>
  )
}

export function DecisionLogView({ entries }: { readonly entries: readonly DecisionLogEntry[] }) {
  return (
    <ReadingColumn>
      <h1>Decisions</h1>
      {entries.length === 0 ? (
        <Notice tone="info">There aren’t any decisions in the log yet.</Notice>
      ) : (
        <DecisionLog entries={entries} />
      )}
    </ReadingColumn>
  )
}

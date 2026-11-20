import { type ProgressTracker, type TaskState } from './progress-tracker'

export function trackerWithTasks(states: readonly TaskState[]): ProgressTracker {
  return {
    title: 'Export job',
    goal: undefined,
    tasks: states.map((state, index) => ({
      number: index + 1,
      title: `Task about retry ${index + 1}`,
      state,
    })),
  }
}

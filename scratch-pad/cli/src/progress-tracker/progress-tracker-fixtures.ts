import { type ProgressTracker, type TaskState } from './progress-tracker'

export function trackerWithTasks(states: readonly TaskState[]): ProgressTracker {
  return {
    title: 'Export job',
    goal: undefined,
    tasks: states.map((state, index) => ({
      id: `t-${index + 1}`,
      number: index + 1,
      title: `Task about retry ${index + 1}`,
      state,
      description: undefined,
      subtasks: [],
    })),
  }
}

// Task 1 is to do. Task 2 has the subtasks 2.1 and 2.2 in the given states, and task 3 is to do.
// The ids of the subtasks are t-4 and t-5.
export function trackerWithSubtasks(states: readonly [TaskState, TaskState]): ProgressTracker {
  const [first, second] = states
  const subtask = (id: string, number: string, title: string, state: TaskState) => ({
    id,
    number,
    title,
    state,
    description: undefined,
  })
  const plain = trackerWithTasks(['to-do', 'to-do', 'to-do'])
  return {
    ...plain,
    tasks: plain.tasks.map((task) =>
      task.number === 2
        ? {
            ...task,
            state: first === second ? first : 'in-progress',
            subtasks: [
              subtask('t-4', '2.1', 'Retry a failed export', first),
              subtask('t-5', '2.2', 'Log each retry', second),
            ],
          }
        : task,
    ),
  }
}

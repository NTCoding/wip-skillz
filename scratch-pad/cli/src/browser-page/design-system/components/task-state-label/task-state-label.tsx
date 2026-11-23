import './task-state-label.css'

export type TaskState = 'to-do' | 'in-progress' | 'done'

const stateLabels: Readonly<Record<TaskState, string>> = {
  'to-do': 'To do',
  'in-progress': 'In progress',
  done: 'Done',
}

// The state of a task or a subtask as a small pill, like on the progress tracker
export function TaskStateLabel({ state }: { readonly state: TaskState }) {
  return (
    <span className="task-state-label" data-state={state}>
      {stateLabels[state]}
    </span>
  )
}

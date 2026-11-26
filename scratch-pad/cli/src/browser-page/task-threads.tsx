import { useState } from 'react'
import { type Thread } from './api-responses'
import { ThreadCard, ThreadDraft, type RowThread } from './design-system/design-system'
import { shownTime } from './message-time'
import {
  threadCardActions,
  threadStates,
  withPostedThreads,
  type PageActions,
} from './page-with-threads'

interface TaskThreadProps {
  // The id of the task or the subtask, like t-4
  readonly task: string
  readonly thread: Thread | undefined
  readonly actions: PageActions
  readonly onClose: () => void
}

// The thread of a task, below the row of the task on the progress tracker.
// A task without a thread shows the box for the first message instead. The thread that Nick has
// posted is shown until the server returns it in the threads of the scratch pad.
function TaskThread({ task, thread, actions, onClose }: TaskThreadProps) {
  const [posted, setPosted] = useState<ReadonlyMap<string, Thread>>(new Map())
  const remember = (changed: Thread): void => {
    setPosted(new Map([[changed.id, changed]]))
  }
  const [shown] = withPostedThreads(thread === undefined ? [] : [thread], posted)
  if (shown === undefined) {
    return (
      <ThreadDraft
        kind="comment"
        selectedText=""
        onSend={async (text) => remember(await actions.startTaskThread(task, text))}
        onCancel={onClose}
      />
    )
  }
  return (
    <ThreadCard
      id={shown.id}
      kind={shown.type}
      messages={shown.messages.map((message) => ({
        ...message,
        shownTime: shownTime(message.time),
      }))}
      state={threadStates[shown.waitsFor]}
      outcome={shown.outcome}
      textChanged={false}
      active={false}
      onActivate={() => undefined}
      {...threadCardActions(actions, shown.id, remember)}
    />
  )
}

// The row of a task that is assigned to Nick or that already has a thread shows the thread. Only
// the server returns the threads on the tasks. That's why a row in the export doesn't have a
// thread.
export function rowThreadOf(
  task: string,
  threads: readonly Thread[],
  actions: PageActions | undefined,
): RowThread | undefined {
  const thread = threads.find((each) => each.task === task)
  return actions === undefined
    ? undefined
    : {
        id: thread?.id,
        content: (close) => (
          <TaskThread task={task} thread={thread} actions={actions} onClose={close} />
        ),
      }
}

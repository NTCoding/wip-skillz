import { Fragment, useState } from 'react'
import { type Thread } from './api-responses'
import { Notice, ReadingColumn, ThreadCard } from './design-system/design-system'
import { shownTime } from './message-time'
import {
  threadCardActions,
  threadStates,
  withPostedThreads,
  type PageActions,
} from './page-with-threads'

interface MissingPageViewProps {
  readonly file: string
  readonly threads: readonly Thread[]
  readonly actions: PageActions | undefined
}

export function MissingPageView({ file, threads, actions }: MissingPageViewProps) {
  const [posted, setPosted] = useState<ReadonlyMap<string, Thread>>(new Map())
  const remember = (thread: Thread): void => {
    setPosted((current) => new Map([...current, [thread.id, thread]]))
  }
  const shown = withPostedThreads(threads, posted)
  return (
    <ReadingColumn>
      <h1>{file}</h1>
      {shown.length === 0 ? (
        <Notice tone="info">There isn’t any page called {file} in this scratch pad.</Notice>
      ) : (
        <Notice tone="warning">
          The agent has deleted this page. The comments below still wait for you. You can reply to
          them or resolve them here.
        </Notice>
      )}
      {shown.map((thread) => (
        <Fragment key={thread.id}>
          {thread.anchor !== undefined && <blockquote>{thread.anchor.selectedText}</blockquote>}
          <ThreadCard
            id={thread.id}
            kind={thread.type}
            messages={thread.messages.map((message) => ({
              ...message,
              shownTime: shownTime(message.time),
            }))}
            state={threadStates[thread.waitsFor]}
            outcome={thread.outcome}
            textChanged={false}
            active={false}
            onActivate={() => undefined}
            {...(actions === undefined ? {} : threadCardActions(actions, thread.id, remember))}
          />
        </Fragment>
      ))}
    </ReadingColumn>
  )
}

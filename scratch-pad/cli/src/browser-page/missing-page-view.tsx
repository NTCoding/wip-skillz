import { Fragment, useState } from 'react'
import { type QueuedComment, type QueuedItem, type Thread } from './api-responses'
import { MarginCard, Notice, ReadingColumn, ThreadCard } from './design-system/design-system'
import { shownTime } from './message-time'
import { queuedItemMessage, queuedRepliesTo } from './queued-items'
import {
  threadCardActions,
  threadStates,
  withPostedThreads,
  type PageActions,
} from './page-with-threads'

interface MissingPageViewProps {
  readonly file: string
  // The threads on the deleted page that wait for Nick
  readonly threads: readonly Thread[]
  // Every thread on the deleted page. The view also shows the ones that have a queued reply,
  // because Send all still sends that reply.
  readonly pageThreads: readonly Thread[]
  // Every item in the outbox. The view shows the queued comments on the deleted page and the
  // queued replies to its threads, because Send all still sends them.
  readonly outbox: readonly QueuedItem[]
  readonly actions: PageActions | undefined
}

function warningText(waiting: number, queued: number): string {
  return [
    'The agent has deleted this page.',
    ...(waiting > 0
      ? ['The comments below still wait for you. You can reply to them or resolve them here.']
      : []),
    ...(queued > 0
      ? ['Your outbox still contains items for this page. You can edit them or remove them here.']
      : []),
  ].join(' ')
}

export function MissingPageView(props: MissingPageViewProps) {
  const { file, threads, outbox, actions } = props
  const [posted, setPosted] = useState<ReadonlyMap<string, Thread>>(new Map())
  const remember = (thread: Thread): void => {
    setPosted((current) => new Map([...current, [thread.id, thread]]))
  }
  const waiting = withPostedThreads(threads, posted)
  const withQueuedReplies = props.pageThreads.filter(
    (thread) =>
      !waiting.some((each) => each.id === thread.id) &&
      queuedRepliesTo(outbox, thread.id).length > 0,
  )
  const shown = [...waiting, ...withQueuedReplies]
  const queued = outbox.filter(
    (item): item is QueuedComment => item.kind === 'comment' && item.page === `pages/${file}`,
  )
  const queuedReplies = shown.flatMap((thread) => queuedRepliesTo(outbox, thread.id))
  return (
    <ReadingColumn>
      <h1>{file}</h1>
      {shown.length === 0 && queued.length === 0 ? (
        <Notice tone="info">There isn’t any page called {file} in this scratch pad.</Notice>
      ) : (
        <Notice tone="warning">
          {warningText(waiting.length, queued.length + queuedReplies.length)}
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
            outbox={
              actions === undefined
                ? undefined
                : queuedRepliesTo(outbox, thread.id).map((item) =>
                    queuedItemMessage(actions, item, 'Reply'),
                  )
            }
          />
        </Fragment>
      ))}
      {actions !== undefined &&
        queued.map((item) => (
          <Fragment key={item.number}>
            <blockquote>{item.anchor.selectedText}</blockquote>
            <MarginCard
              label="Comment in the outbox"
              kind="comment"
              active={false}
              onFocus={() => undefined}
            >
              {queuedItemMessage(actions, item, 'Comment')}
            </MarginCard>
          </Fragment>
        ))}
    </ReadingColumn>
  )
}

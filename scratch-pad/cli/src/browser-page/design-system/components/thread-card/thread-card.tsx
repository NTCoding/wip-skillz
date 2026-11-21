import { useState } from 'react'
import { Button } from '../button/button'
import { Icon, type IconName } from '../icon/icon'
import { IconButton } from '../icon-button/icon-button'
import { MarginCard } from '../margin-card/margin-card'
import { MessageBox, problemOf } from '../message-box/message-box'
import { ThreadKind, threadKindLabels, type ThreadKindName } from '../thread-kind/thread-kind'
import './thread-card.css'

export interface ThreadMessage {
  readonly author: 'nick' | 'agent'
  readonly text: string
  readonly time: string
  readonly shownTime: string
}

export type ThreadState = 'waits-for-agent' | 'waits-for-nick' | 'resolved'

interface ThreadCardProps {
  readonly id: string
  readonly kind: ThreadKindName
  readonly messages: readonly ThreadMessage[]
  readonly state: ThreadState
  readonly outcome: string | undefined
  readonly textChanged: boolean
  readonly active: boolean
  readonly onActivate: () => void
  readonly onReply?: ((text: string) => Promise<void>) | undefined
  readonly onResolve?: (() => Promise<void>) | undefined
}

const authorNames = { nick: 'Nick', agent: 'Agent' } as const

const states: Readonly<Record<ThreadState, { readonly icon: IconName; readonly text: string }>> = {
  'waits-for-agent': { icon: 'sent', text: 'Sent to the agent' },
  'waits-for-nick': { icon: 'comment', text: 'The agent replied' },
  resolved: { icon: 'check', text: 'Resolved' },
}

function MessageList({ messages }: { readonly messages: readonly ThreadMessage[] }) {
  return (
    <ol className="thread-card__messages">
      {messages.map((message, index) => (
        <li className="thread-card__message" key={index}>
          <span className="thread-card__avatar" data-author={message.author} aria-hidden="true">
            {authorNames[message.author].slice(0, 1)}
          </span>
          <div className="thread-card__body">
            <p className="thread-card__meta">
              <span className="thread-card__author">{authorNames[message.author]}</span>
              <time className="thread-card__time" dateTime={message.time}>
                {message.shownTime}
              </time>
            </p>
            <p className="thread-card__text">{message.text}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

function moreMessagesLabel(count: number): string {
  return `Show ${count} more ${count === 1 ? 'message' : 'messages'}`
}

function ResolvedMessages({ messages }: { readonly messages: readonly ThreadMessage[] }) {
  const [opened, setOpened] = useState(false)
  const laterMessages = messages.length - 1
  return (
    <>
      <MessageList messages={opened ? messages : messages.slice(0, 1)} />
      {laterMessages > 0 && (
        <span className="thread-card__more">
          <Button onClick={() => setOpened(!opened)}>
            {opened ? 'Hide the replies' : moreMessagesLabel(laterMessages)}
          </Button>
        </span>
      )}
    </>
  )
}

export function ThreadCard(props: ThreadCardProps) {
  const { id, kind, messages, state, outcome, textChanged, onReply, onResolve } = props
  const [problem, setProblem] = useState<string | undefined>(undefined)
  const resolved = state === 'resolved'
  const resolveWith = (resolveThread: () => Promise<void>): void => {
    setProblem(undefined)
    resolveThread().catch((error: unknown) => setProblem(problemOf(error)))
  }
  return (
    <MarginCard
      id={id}
      label={`${threadKindLabels[kind]} ${id}`}
      kind={kind}
      active={props.active}
      onFocus={props.onActivate}
    >
      {kind !== 'comment' && <ThreadKind kind={kind} />}
      {!resolved && onResolve !== undefined && (
        <span className="thread-card__resolve">
          <IconButton icon="check" label={`Resolve ${id}`} onClick={() => resolveWith(onResolve)} />
        </span>
      )}
      {textChanged && !resolved && (
        <p className="thread-card__changed">
          <Icon name="text-changed" />
          The text has changed
        </p>
      )}
      {resolved ? <ResolvedMessages messages={messages} /> : <MessageList messages={messages} />}
      <p className="thread-card__state" data-state={state}>
        <Icon name={states[state].icon} />
        {states[state].text}
      </p>
      {outcome !== undefined && <p className="thread-card__outcome">Done: {outcome}</p>}
      {problem !== undefined && (
        <p className="thread-card__problem" role="alert">
          {problem}
        </p>
      )}
      {onReply !== undefined && (
        <MessageBox
          label={resolved ? 'Reply to reopen…' : 'Write a reply…'}
          submitLabel={resolved ? 'Reopen' : 'Reply'}
          onSubmit={onReply}
        />
      )}
    </MarginCard>
  )
}

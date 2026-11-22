import { useState, type ReactNode } from 'react'
import { Button } from '../button/button'
import { FullSizeView } from '../full-size-view/full-size-view'
import { Highlight } from '../highlight/highlight'
import { Icon, type IconName } from '../icon/icon'
import { IconButton } from '../icon-button/icon-button'
import { MarginCard } from '../margin-card/margin-card'
import { Message } from '../message/message'
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

// The text that Nick selected for the thread and the text around it, which the full size view
// quotes above the messages
export interface ThreadQuote {
  readonly prefix: string | undefined
  readonly selectedText: string
  readonly suffix: string | undefined
}

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
  readonly onAddToOutbox?: ((text: string) => Promise<void>) | undefined
  readonly onResolve?: (() => Promise<void>) | undefined
  readonly quote?: ThreadQuote | undefined
  // The replies of this thread that wait in the outbox, which are shown below the state
  readonly outbox?: ReactNode
}

const states: Readonly<Record<ThreadState, { readonly icon: IconName; readonly text: string }>> = {
  'waits-for-agent': { icon: 'sent', text: 'Sent to the agent' },
  'waits-for-nick': { icon: 'comment', text: 'The agent replied' },
  resolved: { icon: 'check', text: 'Resolved' },
}

function MessageList({ messages }: { readonly messages: readonly ThreadMessage[] }) {
  return (
    <ol className="thread-card__messages">
      {messages.map((message, index) => (
        <li key={index}>
          <Message {...message} />
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

interface ReplyBoxProps {
  readonly resolved: boolean
  readonly onReply: (text: string) => Promise<void>
  readonly onAddToOutbox: ((text: string) => Promise<void>) | undefined
}

function ReplyBox({ resolved, onReply, onAddToOutbox }: ReplyBoxProps) {
  return (
    <MessageBox
      label={resolved ? 'Reply to reopen…' : 'Write a reply…'}
      submitLabel={resolved ? 'Reopen' : 'Reply'}
      onSubmit={onReply}
      secondSubmit={
        onAddToOutbox === undefined
          ? undefined
          : { label: 'Add to outbox', onSubmit: onAddToOutbox }
      }
    />
  )
}

const longestQuoteInLabel = 60

function fullSizeLabel(quote: ThreadQuote | undefined): string {
  const text = quote === undefined ? undefined : quote.selectedText.trim()
  if (text === undefined || text === '') {
    return 'Thread'
  }
  const shown =
    text.length > longestQuoteInLabel ? `${text.slice(0, longestQuoteInLabel).trimEnd()}…` : text
  return `Thread on “${shown}”`
}

function Quote({ quote, kind }: { readonly quote: ThreadQuote; readonly kind: ThreadKindName }) {
  return (
    <blockquote className="thread-card__quote">
      {quote.prefix}
      <Highlight threads={[]} kind={kind} active={false}>
        {quote.selectedText}
      </Highlight>
      {quote.suffix}
    </blockquote>
  )
}

interface ThreadToolsProps {
  readonly id: string
  readonly openFullSize: () => void
  readonly resolve: (() => void) | undefined
}

function ThreadTools({ id, openFullSize, resolve }: ThreadToolsProps) {
  return (
    <span className="thread-card__tools">
      <IconButton icon="full-size" label={`Open ${id} at full size`} onClick={openFullSize} />
      {resolve !== undefined && (
        <IconButton icon="check" label={`Resolve ${id}`} onClick={resolve} />
      )}
    </span>
  )
}

interface ThreadMessagesProps {
  readonly messages: readonly ThreadMessage[]
  readonly state: ThreadState
  readonly fullSize: boolean
}

// A resolved card only shows the first message until Nick opens the replies, whereas the full size
// view shows every message.
function ThreadMessages({ messages, state, fullSize }: ThreadMessagesProps) {
  return (
    <>
      {state === 'resolved' && !fullSize ? (
        <ResolvedMessages messages={messages} />
      ) : (
        <MessageList messages={messages} />
      )}
      <p className="thread-card__state" data-state={state}>
        <Icon name={states[state].icon} />
        {states[state].text}
      </p>
    </>
  )
}

// The full size view shows the same content as the card, so a reply that Nick has started in the
// card is still in the reply box at full size.
export function ThreadCard(props: ThreadCardProps) {
  const { id, kind, messages, state, outcome, textChanged, onReply, onAddToOutbox, onResolve } =
    props
  const [problem, setProblem] = useState<string | undefined>(undefined)
  const resolved = state === 'resolved'
  const resolve =
    resolved || onResolve === undefined
      ? undefined
      : () => {
          setProblem(undefined)
          onResolve().catch((error: unknown) => setProblem(problemOf(error)))
        }
  return (
    <MarginCard
      id={id}
      label={`${threadKindLabels[kind]} ${id}`}
      kind={kind}
      active={props.active}
      onFocus={props.onActivate}
    >
      <FullSizeView label={fullSizeLabel(props.quote)}>
        {({ open, openFullSize }) => (
          <div className="thread-card" data-full-size={open}>
            <ThreadTools id={id} openFullSize={openFullSize} resolve={resolve} />
            {kind !== 'comment' && <ThreadKind kind={kind} />}
            {open && props.quote !== undefined && <Quote quote={props.quote} kind={kind} />}
            {textChanged && !resolved && (
              <p className="thread-card__changed">
                <Icon name="text-changed" />
                The text has changed
              </p>
            )}
            <ThreadMessages messages={messages} state={state} fullSize={open} />
            {outcome !== undefined && <p className="thread-card__outcome">Done: {outcome}</p>}
            {props.outbox}
            {problem !== undefined && (
              <p className="thread-card__problem" role="alert">
                {problem}
              </p>
            )}
            {onReply !== undefined && (
              <div className="thread-card__reply">
                <ReplyBox resolved={resolved} onReply={onReply} onAddToOutbox={onAddToOutbox} />
              </div>
            )}
          </div>
        )}
      </FullSizeView>
    </MarginCard>
  )
}

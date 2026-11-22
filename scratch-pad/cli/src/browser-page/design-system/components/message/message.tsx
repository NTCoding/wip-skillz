import { type ReactNode } from 'react'
import './message.css'

const authorNames = { nick: 'Nick', agent: 'Agent' } as const

// Message shows one message of a thread with its avatar, its author, its time and its text.
interface MessageProps {
  readonly author: 'nick' | 'agent'
  readonly text: string
  readonly time: string
  readonly shownTime: string
  // The editor is a box that Nick edits the text in, which is shown in place of the text.
  readonly editor?: ReactNode
}

export function Message({ author, text, time, shownTime, editor }: MessageProps) {
  return (
    <div className="message">
      <span className="message__avatar" data-author={author} aria-hidden="true">
        {authorNames[author].slice(0, 1)}
      </span>
      <div className="message__body">
        <p className="message__meta">
          <span className="message__author">{authorNames[author]}</span>
          <time className="message__time" dateTime={time}>
            {shownTime}
          </time>
        </p>
        {editor ?? <p className="message__text">{text}</p>}
      </div>
    </div>
  )
}

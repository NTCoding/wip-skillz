import { type ReactNode } from 'react'
import './agent-note.css'

interface AgentNoteProps {
  readonly children: ReactNode
}

// The label is a figcaption so that the text of the block leaves the label out, like the bar
// of a code block. The server builds the same text from the Markdown of the note.
export function AgentNote({ children }: AgentNoteProps) {
  return (
    <figure className="agent-note">
      <figcaption className="agent-note__label">Agent note</figcaption>
      <div className="agent-note__body">{children}</div>
    </figure>
  )
}

import { useEffect, useEffectEvent, useState } from 'react'
import { Button } from '../button/button'
import { Icon } from '../icon/icon'
import { Message } from '../message/message'
import { MessageBox, problemOf } from '../message-box/message-box'
import './outbox-message.css'

// A comment or a reply that Nick has added to the outbox. The agent doesn't see it until Nick
// sends the outbox, so Nick can still edit it or remove it.
interface OutboxMessageProps {
  readonly label: string
  readonly text: string
  readonly time: string
  readonly shownTime: string
  readonly onEdit: (text: string) => Promise<void>
  readonly onRemove: () => Promise<void>
  // OutboxMessage calls onEditingChange with true when Nick starts to edit the message. It calls
  // onEditingChange with false when Nick saves the edit, cancels it or leaves the page.
  readonly onEditingChange: (editing: boolean) => void
}

export function OutboxMessage(props: OutboxMessageProps) {
  const { label, text, onEdit, onRemove } = props
  const [editing, setEditing] = useState(false)
  const [pending, setPending] = useState(false)
  const [problem, setProblem] = useState<string | undefined>(undefined)
  const editingChanged = useEffectEvent((now: boolean) => props.onEditingChange(now))
  useEffect(() => {
    if (!editing) {
      return undefined
    }
    editingChanged(true)
    return () => editingChanged(false)
  }, [editing])
  const remove = (): void => {
    setPending(true)
    setProblem(undefined)
    onRemove().catch((error: unknown) => {
      setProblem(problemOf(error))
      setPending(false)
    })
  }
  return (
    <div className="outbox-message" role="group" aria-label={label}>
      <Message
        author="nick"
        text={text}
        time={props.time}
        shownTime={props.shownTime}
        editor={
          editing ? (
            <MessageBox
              label={`Edit the ${label.toLowerCase()}`}
              submitLabel="Save"
              initialText={text}
              onSubmit={async (newText) => {
                await onEdit(newText)
                setEditing(false)
              }}
              onCancel={() => setEditing(false)}
              focusOnMount
            />
          ) : undefined
        }
      />
      <div className="outbox-message__footer">
        <p className="outbox-message__state">
          <Icon name="outbox" />
          In outbox
        </p>
        {!editing && (
          <span className="outbox-message__actions">
            <Button
              onClick={() => {
                setProblem(undefined)
                setEditing(true)
              }}
              disabled={pending}
            >
              Edit
            </Button>
            <Button onClick={remove} disabled={pending}>
              Remove
            </Button>
          </span>
        )}
      </div>
      {problem !== undefined && (
        <p className="outbox-message__problem" role="alert">
          {problem}
        </p>
      )}
    </div>
  )
}

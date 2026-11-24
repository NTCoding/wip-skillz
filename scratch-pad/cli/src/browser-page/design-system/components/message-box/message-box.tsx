import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Button } from '../button/button'
import { type IconName } from '../icon/icon'
import './message-box.css'

// The second submit is a quiet button before the main one, such as "Outbox" before "Send". The
// button shows its icon before buttonText, which is short so that the button fits in a narrow card.
// A screen reader reads out the label instead, like "Add to outbox". Enter always submits with the
// main button.
interface SecondSubmit {
  readonly label: string
  readonly buttonText: string
  readonly icon: IconName
  readonly onSubmit: (text: string) => Promise<void>
}

// The second submit of a box whose message can wait in the outbox, like a reply to a thread
export const addToOutbox: Omit<SecondSubmit, 'onSubmit'> = {
  label: 'Add to outbox',
  buttonText: 'Outbox',
  icon: 'plus',
}

interface MessageBoxProps {
  readonly label: string
  readonly submitLabel: string
  readonly onSubmit: (text: string) => Promise<void>
  readonly secondSubmit?: SecondSubmit | undefined
  readonly onCancel?: () => void
  readonly focusOnMount?: boolean
  readonly initialText?: string
}

export function problemOf(error: unknown): string {
  return error instanceof Error ? error.message : 'The server didn’t accept the message.'
}

export function MessageBox({
  label,
  submitLabel,
  onSubmit,
  secondSubmit,
  onCancel,
  focusOnMount = false,
  initialText = '',
}: MessageBoxProps) {
  const field = useRef<HTMLTextAreaElement>(null)
  const [text, setText] = useState(initialText)
  const [pending, setPending] = useState(false)
  const [problem, setProblem] = useState<string | undefined>(undefined)
  useEffect(() => {
    if (focusOnMount) {
      field.current?.focus({ preventScroll: true })
      field.current?.setSelectionRange(initialText.length, initialText.length)
    }
  }, [focusOnMount, initialText])
  const message = text.trim()
  const submit = async (send = onSubmit): Promise<void> => {
    if (message === '' || pending) {
      return
    }
    setPending(true)
    setProblem(undefined)
    try {
      await send(message)
      setText('')
    } catch (error: unknown) {
      setProblem(problemOf(error))
    } finally {
      setPending(false)
    }
  }
  const handleKey = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submit()
    }
    if (event.key === 'Escape' && onCancel !== undefined) {
      event.preventDefault()
      onCancel()
    }
  }
  return (
    <div className="message-box">
      <textarea
        ref={field}
        className="message-box__field"
        aria-label={label}
        placeholder={label}
        rows={1}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKey}
      />
      {problem !== undefined && (
        <p className="message-box__problem" role="alert">
          {problem}
        </p>
      )}
      {(message !== '' || onCancel !== undefined) && (
        <div className="message-box__actions">
          {onCancel !== undefined && <Button onClick={onCancel}>Cancel</Button>}
          {secondSubmit !== undefined && (
            <Button
              label={secondSubmit.label}
              icon={secondSubmit.icon}
              onClick={() => {
                void submit(secondSubmit.onSubmit)
              }}
              disabled={message === '' || pending}
            >
              {secondSubmit.buttonText}
            </Button>
          )}
          <Button
            variant="primary"
            onClick={() => {
              void submit()
            }}
            disabled={message === '' || pending}
          >
            {submitLabel}
          </Button>
        </div>
      )}
    </div>
  )
}

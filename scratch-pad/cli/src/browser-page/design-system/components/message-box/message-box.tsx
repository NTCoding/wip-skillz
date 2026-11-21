import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Button } from '../button/button'
import './message-box.css'

interface MessageBoxProps {
  readonly label: string
  readonly submitLabel: string
  readonly onSubmit: (text: string) => Promise<void>
  readonly onCancel?: () => void
  readonly focusOnMount?: boolean
}

export function problemOf(error: unknown): string {
  return error instanceof Error ? error.message : 'The server didn’t accept the message.'
}

export function MessageBox({
  label,
  submitLabel,
  onSubmit,
  onCancel,
  focusOnMount = false,
}: MessageBoxProps) {
  const field = useRef<HTMLTextAreaElement>(null)
  const [text, setText] = useState('')
  const [pending, setPending] = useState(false)
  const [problem, setProblem] = useState<string | undefined>(undefined)
  useEffect(() => {
    if (focusOnMount) {
      field.current?.focus({ preventScroll: true })
    }
  }, [focusOnMount])
  const message = text.trim()
  const submit = async (): Promise<void> => {
    if (message === '' || pending) {
      return
    }
    setPending(true)
    setProblem(undefined)
    try {
      await onSubmit(message)
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

import { useEffect, useRef, useState } from 'react'
import { Button } from '../button/button'
import { problemOf } from '../message-box/message-box'
import './improvement-form.css'

export interface ImprovementEdit {
  readonly title: string
  readonly details: string | undefined
}

interface ImprovementFormProps {
  readonly title: string
  readonly details: string | undefined
  readonly onSave: (edit: ImprovementEdit) => Promise<void>
  readonly onCancel: () => void
}

export function ImprovementForm({ title, details, onSave, onCancel }: ImprovementFormProps) {
  const titleField = useRef<HTMLInputElement>(null)
  const detailsField = useRef<HTMLTextAreaElement>(null)
  const [newTitle, setNewTitle] = useState(title)
  const [pending, setPending] = useState(false)
  const [problem, setProblem] = useState<string | undefined>(undefined)
  useEffect(() => {
    titleField.current?.focus({ preventScroll: true })
  }, [])
  const save = (): void => {
    setPending(true)
    setProblem(undefined)
    onSave({ title: newTitle, details: detailsField.current?.value })
      .catch((error: unknown) => setProblem(problemOf(error)))
      .finally(() => setPending(false))
  }
  return (
    <div className="improvement-form" role="group" aria-label="Edit the improvement">
      <label className="improvement-form__label">
        Title
        <input
          ref={titleField}
          className="improvement-form__field"
          type="text"
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
        />
      </label>
      <label className="improvement-form__label">
        Details in Markdown
        <textarea
          ref={detailsField}
          className="improvement-form__field improvement-form__field--details"
          defaultValue={details}
        />
      </label>
      {problem !== undefined && (
        <p className="improvement-form__problem" role="alert">
          {problem}
        </p>
      )}
      <div className="improvement-form__actions">
        <Button onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button variant="primary" onClick={save} disabled={pending || newTitle.trim() === ''}>
          Save
        </Button>
      </div>
    </div>
  )
}

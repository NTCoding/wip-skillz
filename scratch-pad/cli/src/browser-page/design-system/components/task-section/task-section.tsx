import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from '../icon/icon'
import './task-section.css'

interface TaskSectionProps {
  // The id of the task, like t-4, which is the anchor of the heading
  readonly id: string
  readonly level: 2 | 3
  readonly title: string
  // The section is collapsed until Nick opens it. It's opened when open is true, like after Nick
  // has followed a link to the task.
  readonly open: boolean
  // A new value every time Nick follows a link. So a section that Nick has closed by hand opens
  // again when he follows the same link again.
  readonly openRequest?: number
  readonly children: ReactNode
}

// The description of a task under the list of tasks on the progress tracker. The description of a
// subtask is a section of level 3 inside the section of its task.
export function TaskSection({ id, level, title, open, openRequest, children }: TaskSectionProps) {
  const section = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    if (open && section.current !== null) {
      section.current.open = true
    }
  }, [open, openRequest])
  return (
    <details ref={section} className="task-section" data-level={level} open={open}>
      <summary className="task-section__summary">
        <span className="task-section__chevron">
          <Icon name="chevron" />
        </span>
        {level === 2 ? (
          <h2 id={id} className="task-section__heading">
            {title}
          </h2>
        ) : (
          <h3 id={id} className="task-section__heading">
            {title}
          </h3>
        )}
      </summary>
      <div className="task-section__body">{children}</div>
    </details>
  )
}

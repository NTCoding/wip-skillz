import { type ReactNode } from 'react'
import { navigationClick, type Navigate } from '../../navigation-click'
import './task-link.css'

interface TaskLinkProps {
  // The address of the task on the progress tracker. A reference to a task that doesn't exist
  // doesn't have an address, so its text isn't a link.
  readonly href: string | undefined
  readonly onNavigate: Navigate
  readonly children: ReactNode
}

// A reference to a task or a subtask in the text of a page, like "2.1 Retry a failed export". The
// text of a reference isn't part of the text that a comment is attached to, because the server
// doesn't know the number and the title of the task when it builds that text. data-task-reference
// marks the element for visible-text.ts.
export function TaskLink({ href, onNavigate, children }: TaskLinkProps) {
  if (href === undefined) {
    return (
      <span className="task-link" data-task-reference="">
        {children}
      </span>
    )
  }
  return (
    <a
      className="task-link"
      href={href}
      data-task-reference=""
      onClick={navigationClick(href, onNavigate)}
    >
      {children}
    </a>
  )
}

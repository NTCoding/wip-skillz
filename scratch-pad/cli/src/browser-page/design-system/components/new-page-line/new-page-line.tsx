import { usePendingAction } from '../../pending-action'
import { Icon } from '../icon/icon'
import './new-page-line.css'

interface NewPageLineProps {
  readonly onMarkAsRead: () => Promise<void>
}

// The line at the top of a page that Nick hasn't read yet
export function NewPageLine({ onMarkAsRead }: NewPageLineProps) {
  const { pending, problem, run } = usePendingAction(onMarkAsRead)
  return (
    <div className="new-page-line">
      <p className="new-page-line__bar">
        <Icon name="page" />
        <span className="new-page-line__text">This page is new.</span>
        <button type="button" className="new-page-line__button" onClick={run} disabled={pending}>
          Mark as read
        </button>
      </p>
      {problem !== undefined && (
        <p className="new-page-line__problem" role="alert">
          {problem}
        </p>
      )}
    </div>
  )
}

import { useState, type ReactNode } from 'react'
import { navigationClick, type Navigate } from '../../navigation-click'
import { timeFormat } from '../../time-format'
import { Button } from '../button/button'
import { Icon } from '../icon/icon'
import { IconButton } from '../icon-button/icon-button'
import { ImprovementForm, type ImprovementEdit } from '../improvement-form/improvement-form'
import { problemOf } from '../message-box/message-box'
import { ThreadKind } from '../thread-kind/thread-kind'
import './improvement-list.css'

export type ImprovementRow =
  | {
      readonly from: 'agent'
      readonly id: string
      readonly number: number
      readonly time: string
      readonly title: string
      readonly markdown: string | undefined
      readonly details: ReactNode | undefined
      readonly open: boolean
    }
  | {
      readonly from: 'grammar' | 'improvement'
      readonly id: string
      readonly href: string
      readonly time: string
      readonly text: string
      readonly outcome: string | undefined
    }

type AgentRow = Extract<ImprovementRow, { from: 'agent' }>

export interface ImprovementActions {
  readonly edit: (number: number, edit: ImprovementEdit) => Promise<void>
  readonly delete: (number: number) => Promise<void>
}

interface ImprovementListProps {
  readonly label: string
  readonly entries: readonly ImprovementRow[]
  readonly onNavigate: Navigate
  readonly actions?: ImprovementActions | undefined
}

function time(entry: ImprovementRow): ReactNode {
  return <time dateTime={entry.time}>{timeFormat.format(new Date(entry.time))}</time>
}

interface AgentEntryProps {
  readonly entry: AgentRow
  readonly actions: ImprovementActions | undefined
}

function AgentEntry({ entry, actions }: AgentEntryProps) {
  const [mode, setMode] = useState<'reading' | 'editing' | 'deleting'>('reading')
  const [pending, setPending] = useState(false)
  const [problem, setProblem] = useState<string | undefined>(undefined)
  const show = (next: typeof mode) => (): void => {
    setProblem(undefined)
    setMode(next)
  }
  const confirmDelete = (changes: ImprovementActions): void => {
    setPending(true)
    setProblem(undefined)
    changes.delete(entry.number).catch((error: unknown) => {
      setProblem(problemOf(error))
      setPending(false)
    })
  }
  return (
    <li id={entry.id} className="improvement-list__entry">
      <p className="improvement-list__meta">
        <span className="improvement-list__number">{entry.number}</span>
        {time(entry)}
        <span className="improvement-list__source">From the agent</span>
        {actions !== undefined && mode === 'reading' && (
          <span className="improvement-list__actions">
            <IconButton
              icon="edit"
              label={`Edit improvement ${entry.number}`}
              onClick={show('editing')}
            />
            <IconButton
              icon="delete"
              label={`Delete improvement ${entry.number}`}
              onClick={show('deleting')}
            />
          </span>
        )}
      </p>
      {actions !== undefined && mode === 'editing' ? (
        <div className="improvement-list__form">
          <ImprovementForm
            title={entry.title}
            details={entry.markdown}
            onSave={async (edit) => {
              await actions.edit(entry.number, edit)
              setMode('reading')
            }}
            onCancel={show('reading')}
          />
        </div>
      ) : (
        <>
          <p className="improvement-list__text">{entry.title}</p>
          {entry.details !== undefined && (
            <details className="improvement-list__details" open={entry.open}>
              <summary className="improvement-list__summary">Details</summary>
              <div className="improvement-list__body">{entry.details}</div>
            </details>
          )}
        </>
      )}
      {actions !== undefined && mode === 'deleting' && (
        <div
          className="improvement-list__confirm"
          role="group"
          aria-label={`Delete improvement ${entry.number}`}
        >
          <p className="improvement-list__question">
            Delete improvement {entry.number}? It can’t be restored.
          </p>
          <div className="improvement-list__choices">
            <Button onClick={show('reading')} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={() => confirmDelete(actions)} disabled={pending}>
              Delete
            </Button>
          </div>
          {problem !== undefined && (
            <p className="improvement-list__problem" role="alert">
              {problem}
            </p>
          )}
        </div>
      )}
    </li>
  )
}

function entryOf(
  entry: ImprovementRow,
  onNavigate: Navigate,
  actions: ImprovementActions | undefined,
): ReactNode {
  if (entry.from === 'agent') {
    return <AgentEntry key={`agent-${entry.id}`} entry={entry} actions={actions} />
  }
  return (
    <li key={`note-${entry.id}`} className="improvement-list__entry">
      <p className="improvement-list__meta">
        {time(entry)}
        <ThreadKind kind={entry.from} />
        <a
          className="improvement-list__thread"
          href={entry.href}
          onClick={navigationClick(entry.href, onNavigate)}
        >
          {entry.id}
        </a>
        {entry.outcome !== undefined && (
          <span className="improvement-list__done">
            <Icon name="check" />
            Done
          </span>
        )}
      </p>
      <p className="improvement-list__text">{entry.text}</p>
      {entry.outcome !== undefined && <p className="improvement-list__outcome">{entry.outcome}</p>}
    </li>
  )
}

export function ImprovementList({ label, entries, onNavigate, actions }: ImprovementListProps) {
  return (
    <ol className="improvement-list" aria-label={label}>
      {entries.map((entry) => entryOf(entry, onNavigate, actions))}
    </ol>
  )
}

import './decision-log.css'

export interface DecisionLogRow {
  readonly number: number
  readonly time: string
  readonly source: 'chat' | 'page'
  readonly text: string
  readonly decision: string | undefined
}

interface DecisionLogProps {
  readonly entries: readonly DecisionLogRow[]
}

const timeFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const sourceLabels = { chat: 'In the chat', page: 'On a page' } as const

export function DecisionLog({ entries }: DecisionLogProps) {
  return (
    <ol className="decision-log">
      {entries.map((entry) => (
        <li key={entry.number} className="decision-log__entry">
          <p className="decision-log__meta">
            <span className="decision-log__number">{entry.number}</span>
            <time dateTime={entry.time}>{timeFormat.format(new Date(entry.time))}</time>
            <span className="decision-log__source">{sourceLabels[entry.source]}</span>
            {entry.decision !== undefined && (
              <span className="decision-log__id">{entry.decision}</span>
            )}
          </p>
          <p className="decision-log__text">{entry.text}</p>
        </li>
      ))}
    </ol>
  )
}

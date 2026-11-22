import './filter-pills.css'

export interface FilterPill<T extends string> {
  readonly value: T
  readonly label: string
  readonly count: number
}

interface FilterPillsProps<T extends string> {
  readonly label: string
  readonly pills: readonly FilterPill<T>[]
  readonly selected: T
  readonly onSelect: (value: T) => void
}

// A row of buttons that picks which items a list shows. The selected button is pressed.
export function FilterPills<T extends string>({
  label,
  pills,
  selected,
  onSelect,
}: FilterPillsProps<T>) {
  return (
    <div className="filter-pills" role="group" aria-label={label}>
      {pills.map((pill) => (
        <button
          key={pill.value}
          type="button"
          className="filter-pills__pill"
          aria-pressed={pill.value === selected}
          onClick={() => onSelect(pill.value)}
        >
          {pill.label}
          <span className="filter-pills__count">{pill.count}</span>
        </button>
      ))}
    </div>
  )
}

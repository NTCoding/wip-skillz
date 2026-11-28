import './draft-toggle.css'

interface DraftToggleProps {
  readonly enabled: boolean
  readonly onChange: (enabled: boolean) => void
}

export function DraftToggle({ enabled, onChange }: DraftToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label="Draft mode"
      className="draft-toggle"
      onClick={() => onChange(!enabled)}
    >
      <span className="draft-toggle__track" aria-hidden="true">
        <span className="draft-toggle__thumb" />
      </span>
      <span className="draft-toggle__label">Draft</span>
    </button>
  )
}

import { type ReactNode } from 'react'
import { colourModes } from '../colour-modes'
import './every-colour-mode.css'

interface EveryColourModeProps {
  readonly children: ReactNode
}

function panelLabel(mode: string): string {
  return `${mode.charAt(0).toUpperCase()}${mode.slice(1)}`
}

export function EveryColourMode({ children }: EveryColourModeProps) {
  return (
    <div className="every-colour-mode">
      {colourModes.map((mode) => (
        <section
          key={mode}
          className="every-colour-mode__panel"
          data-colour-mode={mode}
          aria-label={panelLabel(mode)}
        >
          {children}
        </section>
      ))}
    </div>
  )
}

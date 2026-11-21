import { colourModes, type ColourMode } from '../../colour-modes'
import { Icon, type IconName } from '../icon/icon'
import './colour-switcher.css'

interface ColourSwitcherProps {
  readonly mode: ColourMode
  readonly onChange: (mode: ColourMode) => void
}

const buttons: Readonly<Record<ColourMode, { readonly label: string; readonly icon: IconName }>> = {
  light: { label: 'Light', icon: 'sun' },
  dark: { label: 'Dark', icon: 'moon' },
}

export function ColourSwitcher({ mode, onChange }: ColourSwitcherProps) {
  return (
    <div className="colour-switcher" role="group" aria-label="Colour mode">
      {colourModes.map((option) => (
        <button
          key={option}
          type="button"
          className="colour-switcher__option"
          aria-pressed={option === mode}
          onClick={() => onChange(option)}
        >
          <Icon name={buttons[option].icon} />
          {buttons[option].label}
        </button>
      ))}
    </div>
  )
}

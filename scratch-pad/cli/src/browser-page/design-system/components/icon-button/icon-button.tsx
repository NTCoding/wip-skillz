import { type Ref } from 'react'
import { Icon, type IconName } from '../icon/icon'
import './icon-button.css'

interface IconButtonProps {
  readonly icon: IconName
  readonly label: string
  readonly onClick: () => void
  readonly pressed?: boolean
  readonly tone?: 'page' | 'code'
  readonly ref?: Ref<HTMLButtonElement>
}

export function IconButton({ icon, label, onClick, pressed, tone = 'page', ref }: IconButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      className={`icon-button icon-button--${tone}`}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={() => onClick()}
    >
      <Icon name={icon} />
    </button>
  )
}

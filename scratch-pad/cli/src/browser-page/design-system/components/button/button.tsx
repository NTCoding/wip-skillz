import { type ReactNode } from 'react'
import './button.css'

interface ButtonProps {
  readonly children: ReactNode
  readonly onClick: () => void
  readonly variant?: 'primary' | 'quiet'
  readonly disabled?: boolean
}

export function Button({ children, onClick, variant = 'quiet', disabled = false }: ButtonProps) {
  return (
    <button
      type="button"
      className={`button button--${variant}`}
      onClick={() => onClick()}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

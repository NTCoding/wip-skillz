import { type ReactNode } from 'react'
import './status-pill.css'

interface StatusPillProps {
  readonly children: ReactNode
}

export function StatusPill({ children }: StatusPillProps) {
  return (
    <p className="status-pill" role="status">
      {children}
    </p>
  )
}

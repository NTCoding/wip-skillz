import { type ReactNode } from 'react'
import './notice.css'

interface NoticeProps {
  readonly tone: 'info' | 'warning'
  readonly children: ReactNode
}

export function Notice({ tone, children }: NoticeProps) {
  return (
    <div className={`notice notice--${tone}`} role={tone === 'warning' ? 'note' : 'status'}>
      {children}
    </div>
  )
}

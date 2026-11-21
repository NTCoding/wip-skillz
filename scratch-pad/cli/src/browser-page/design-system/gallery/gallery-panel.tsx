import { type ReactNode } from 'react'
import './gallery-panel.css'

interface GalleryPanelProps {
  readonly children: ReactNode
}

export function GalleryPanel({ children }: GalleryPanelProps) {
  return <div className="gallery-panel">{children}</div>
}

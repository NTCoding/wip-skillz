import { type ReactNode, type Ref } from 'react'
import './reading-column.css'

interface ReadingColumnProps {
  readonly children: ReactNode
  readonly margin?: ReactNode
  readonly textRef?: Ref<HTMLElement>
}

export function ReadingColumn({ children, margin, textRef }: ReadingColumnProps) {
  const withMargin = margin !== undefined
  return (
    <div className="reading-column" data-margin-scope={withMargin || undefined}>
      <div className="reading-column__grid">
        <article ref={textRef} className="reading-column__text">
          {children}
        </article>
        {withMargin && <div className="reading-column__margin">{margin}</div>}
      </div>
    </div>
  )
}

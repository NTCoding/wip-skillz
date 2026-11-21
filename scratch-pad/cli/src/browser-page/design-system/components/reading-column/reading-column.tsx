import { type ReactNode, type Ref } from 'react'
import './reading-column.css'

interface ReadingColumnProps {
  readonly children: ReactNode
  readonly margin?: ReactNode
  readonly textRef?: Ref<HTMLElement>
  // What the column shows under the last block of the text, with the normal gap between blocks above it
  readonly end?: ReactNode
}

export function ReadingColumn({ children, margin, textRef, end }: ReadingColumnProps) {
  const withMargin = margin !== undefined
  return (
    <div className="reading-column" data-margin-scope={withMargin || undefined}>
      <div className="reading-column__grid">
        <article ref={textRef} className="reading-column__text">
          {children}
          {end !== undefined && <div className="reading-column__end">{end}</div>}
        </article>
        {withMargin && <div className="reading-column__margin">{margin}</div>}
      </div>
    </div>
  )
}

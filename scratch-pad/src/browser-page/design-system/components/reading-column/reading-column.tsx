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
    <div
      className="reading-column"
      data-margin={withMargin}
      data-margin-scope={withMargin || undefined}
    >
      <article ref={textRef} className="reading-column__text">
        {children}
      </article>
      {withMargin && <div className="reading-column__margin">{margin}</div>}
    </div>
  )
}

import { type ReactNode } from 'react'
import { FullSizeView } from '../full-size-view/full-size-view'
import './table-block.css'

interface TableBlockProps {
  readonly children: ReactNode
}

export function TableBlock({ children }: TableBlockProps) {
  return (
    <FullSizeView label="table">
      <div className="table-block">
        <table className="table-block__table">{children}</table>
      </div>
    </FullSizeView>
  )
}

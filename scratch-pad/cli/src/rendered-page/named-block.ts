import { type DecisionBlock } from './decision-block'
import { type PageProblem } from './page-problem'
import { type SourceLines } from './source-lines'

export interface NamedBlock {
  readonly name: string
  readonly options: string
  readonly body: string
  readonly closed: boolean
  readonly lines: SourceLines
}

export interface NamedBlockContent {
  readonly className: string
  readonly attributes: readonly (readonly [string, string])[]
  readonly html: string
  readonly problems: readonly PageProblem[]
  readonly decision: DecisionBlock | undefined
}

export function bodyLines(block: NamedBlock): string[] {
  return block.body.split('\n')
}

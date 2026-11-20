export interface PageProblem {
  readonly line: number
  readonly text: string
}

export function byLine(first: PageProblem, second: PageProblem): number {
  return first.line - second.line
}

import { countedNoun } from '../counted-noun'
import { type ScratchPadProblem } from './page-check'

export function pageCheckText(problems: readonly ScratchPadProblem[], pageCount: number): string {
  const pages = countedNoun(pageCount, 'page')
  const summary =
    problems.length === 0
      ? `there aren't any problems in ${pages}`
      : `${countedNoun(problems.length, 'problem')} in ${pages}`
  return [...problems.map(problemLine), summary].join('\n')
}

function problemLine(problem: ScratchPadProblem): string {
  const place = problem.line === undefined ? problem.page : `${problem.page}:${problem.line}`
  return `${place}  ${problem.text}`
}

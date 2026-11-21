import { ScratchPadError } from '../scratch-pad-error'

export interface Improvement {
  readonly number: number
  readonly time: string
  readonly title: string
  readonly details: string | undefined
}

export type NewImprovement = Omit<Improvement, 'number'>

export type ImprovementEdit = Pick<Improvement, 'title' | 'details'>

export class EmptyImprovementError extends ScratchPadError {
  constructor() {
    super('The improvement is empty. Write the title of the improvement in one sentence.')
  }
}

export class UnknownImprovementError extends ScratchPadError {
  constructor(number: number, improvements: readonly Improvement[]) {
    super(
      improvements.length === 0
        ? `There isn't any improvement ${number} because there aren't any improvements yet.`
        : `There isn't any improvement ${number}. The numbers of the improvements are ${improvements.map((improvement) => improvement.number).join(', ')}.`,
    )
  }
}

function checkedEdit(edit: ImprovementEdit): ImprovementEdit {
  const title = edit.title.trim()
  if (title === '') {
    throw new EmptyImprovementError()
  }
  const details = edit.details?.trim()
  return { title, details: details === '' ? undefined : details }
}

export function logImprovement(newImprovement: NewImprovement): NewImprovement {
  return { time: newImprovement.time, ...checkedEdit(newImprovement) }
}

export function findImprovement(improvements: readonly Improvement[], number: number): Improvement {
  const improvement = improvements.find((each) => each.number === number)
  if (improvement === undefined) {
    throw new UnknownImprovementError(number, improvements)
  }
  return improvement
}

export function editImprovement(
  improvements: readonly Improvement[],
  number: number,
  edit: ImprovementEdit,
): Improvement {
  return { ...findImprovement(improvements, number), ...checkedEdit(edit) }
}

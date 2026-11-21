import { describe, expect, it } from 'vitest'
import {
  editImprovement,
  EmptyImprovementError,
  findImprovement,
  logImprovement,
  UnknownImprovementError,
} from './improvements'

const time = '2026-03-14T09:30:00.000Z'

const exportBug = {
  time,
  title: ' The export command skips the custom files. ',
  details: '\n## Steps\n\n1. Run export.\n',
}

describe('logImprovement', () => {
  it('trims the title and the details of the improvement', () => {
    expect(logImprovement(exportBug)).toStrictEqual({
      time,
      title: 'The export command skips the custom files.',
      details: '## Steps\n\n1. Run export.',
    })
  })

  it('logs the improvement without details when the details are only white space', () => {
    expect(logImprovement({ ...exportBug, details: ' \n ' }).details).toBeUndefined()
  })

  it('logs the improvement without details when there are no details', () => {
    expect(logImprovement({ ...exportBug, details: undefined }).details).toBeUndefined()
  })

  it('throws EmptyImprovementError when the title is empty', () => {
    const log = () => logImprovement({ ...exportBug, title: '  ' })

    expect(log).toThrow(EmptyImprovementError)
    expect(log).toThrow(
      'The improvement is empty. Write the title of the improvement in one sentence.',
    )
  })
})

const first = { number: 1, ...logImprovement(exportBug) }
const third = { ...first, number: 3, title: 'The inbox prints a note twice.' }

describe('findImprovement', () => {
  it('returns the improvement with the number', () => {
    expect(findImprovement([first, third], 3)).toBe(third)
  })

  it('throws UnknownImprovementError with the numbers of the improvements when the number is unknown', () => {
    const find = () => findImprovement([first, third], 2)

    expect(find).toThrow(UnknownImprovementError)
    expect(find).toThrow("There isn't any improvement 2. The numbers of the improvements are 1, 3.")
  })

  it('throws UnknownImprovementError when there aren’t any improvements yet', () => {
    expect(() => findImprovement([], 1)).toThrow(
      "There isn't any improvement 1 because there aren't any improvements yet.",
    )
  })
})

describe('editImprovement', () => {
  it('replaces the trimmed title and details of the improvement and keeps its number and time', () => {
    expect(
      editImprovement([first, third], 3, {
        title: ' The inbox prints the invoice note twice. ',
        details: '\nRun inbox.\n',
      }),
    ).toStrictEqual({
      number: 3,
      time,
      title: 'The inbox prints the invoice note twice.',
      details: 'Run inbox.',
    })
  })

  it('removes the details when the new details are only white space', () => {
    expect(editImprovement([first], 1, { title: 'Export', details: ' ' }).details).toBeUndefined()
  })

  it('throws EmptyImprovementError when the new title is empty', () => {
    expect(() => editImprovement([first], 1, { title: ' ', details: undefined })).toThrow(
      EmptyImprovementError,
    )
  })

  it('throws UnknownImprovementError when the number is unknown', () => {
    expect(() => editImprovement([first], 2, { title: 'Export', details: undefined })).toThrow(
      UnknownImprovementError,
    )
  })
})

import { afterEach, describe, expect, it } from 'vitest'
import { logImprovementFromChat } from '../agent-commands/improvement-commands'
import { UnknownImprovementError } from '../improvements/improvements'
import { unservedLinks } from '../item-links/item-links-fixtures'
import {
  exportJobPadName,
  exportJobScratchPad,
  freezeClockAt,
  removeTemporaryHomes,
  temporaryHome,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { respondToApiRequest, UnknownRouteError, type ApiResponse } from './scratch-pad-api'

const time = '2026-03-14T09:30:00.000Z'
const padApi = `/api/scratch-pads/${exportJobPadName}`

freezeClockAt(time)

afterEach(() => {
  removeTemporaryHomes()
})

function post(home: string, path: string, body: unknown): ApiResponse {
  return respondToApiRequest({ home, method: 'POST', path, body: JSON.stringify(body) })
}

function jsonBody(response: ApiResponse): unknown {
  return response.kind === 'json' ? response.body : response.kind
}

function homeWithOneImprovement(): string {
  const home = temporaryHome()
  logImprovementFromChat(
    exportJobScratchPad(home),
    'The export skips files.',
    '## Steps',
    unservedLinks,
  )
  return home
}

describe('respondToApiRequest for the improvements', () => {
  it('returns the edited improvement when Nick edits the improvement', () => {
    const home = homeWithOneImprovement()

    expect(
      post(home, `${padApi}/improvements/1`, {
        title: 'The export skips custom files.',
        details: '',
      }),
    ).toStrictEqual({
      kind: 'json',
      status: 200,
      body: {
        improvement: {
          number: 1,
          time,
          title: 'The export skips custom files.',
          details: undefined,
        },
      },
    })
  })

  it('returns the number of the deleted improvement and removes it when Nick deletes the improvement', () => {
    const home = homeWithOneImprovement()

    expect(jsonBody(post(home, `${padApi}/improvements/1/delete`, {}))).toStrictEqual({
      deleted: 1,
    })
    expect(
      jsonBody(
        respondToApiRequest({ home, method: 'GET', path: `${padApi}/improvements`, body: '' }),
      ),
    ).toStrictEqual({ improvements: [], notes: [] })
  })

  it('throws UnknownImprovementError when Nick deletes an improvement that doesn’t exist', () => {
    expect(() => post(homeWithOneImprovement(), `${padApi}/improvements/2/delete`, {})).toThrow(
      UnknownImprovementError,
    )
  })

  it('throws UnknownRouteError when the number of the improvement isn’t a number', () => {
    expect(() => post(homeWithOneImprovement(), `${padApi}/improvements/one`, {})).toThrow(
      UnknownRouteError,
    )
  })
})

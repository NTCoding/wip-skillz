import { afterEach, describe, expect, it } from 'vitest'
import { taxQuestion, writeInvoiceDecisionsPage } from '../nick-views/nick-views-fixtures'
import {
  exportJobPadName,
  exportJobScratchPad,
  freezeClockAt,
  removeTemporaryHomes,
  temporaryHome,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { reopenItem } from '../agent-commands/thread-commands'
import { unservedLinks } from '../item-links/item-links-fixtures'
import { chooseScratchPad } from '../scratch-pads-home/scratch-pads-home'
import { InvalidRequestBodyError } from './request-body'
import { respondToApiRequest, UnknownDecisionBlockError, type ApiResponse } from './scratch-pad-api'

const time = '2026-03-14T09:30:00.000Z'
const padApi = `/api/scratch-pads/${exportJobPadName}`

freezeClockAt(time)

afterEach(() => {
  removeTemporaryHomes()
})

function homeWithExportJob(): string {
  const home = temporaryHome()
  writeInvoiceDecisionsPage(exportJobScratchPad(home))
  return home
}

function get(home: string, path: string): ApiResponse {
  return respondToApiRequest({ home, method: 'GET', path, body: '' })
}

function post(home: string, path: string, body: unknown): ApiResponse {
  return respondToApiRequest({ home, method: 'POST', path, body: JSON.stringify(body) })
}

function jsonBody(response: ApiResponse): unknown {
  return response.kind === 'json' ? response.body : response.kind
}

describe('respondToApiRequest for the decisions that Nick asks for changes on', () => {
  it('saves a decision with changes requested under the id in the address', () => {
    expect(
      post(homeWithExportJob(), `${padApi}/decisions/d-2/request-changes`, {
        page: 'invoice-decisions',
        reason: 'Who is the team?',
      }),
    ).toMatchObject({
      status: 200,
      body: {
        decision: { id: 'd-2', line: 13, reason: 'Who is the team?' },
      },
    })
  })

  it('throws UnknownDecisionBlockError when the page does not have the decision', () => {
    const request = () =>
      post(homeWithExportJob(), `${padApi}/decisions/d-9/request-changes`, {
        page: 'invoice-decisions',
        reason: 'No.',
      })

    expect(request).toThrow(UnknownDecisionBlockError)
  })

  it('throws InvalidRequestBodyError when the body does not have a reason', () => {
    const request = () =>
      post(homeWithExportJob(), `${padApi}/decisions/d-1/request-changes`, {
        page: 'invoice-decisions',
      })

    expect(request).toThrow(InvalidRequestBodyError)
  })

  it('takes the decision out of Nick’s Inbox and shows its review on the page', () => {
    const home = homeWithExportJob()
    post(home, `${padApi}/decisions/d-1/request-changes`, {
      page: 'invoice-decisions',
      reason: 'Who is the team?',
    })

    expect(jsonBody(get(home, `${padApi}/nick-inbox`))).toMatchObject({
      decisions: [{ id: 'd-2' }],
    })
    expect(jsonBody(get(home, `${padApi}/pages/invoice-decisions.md`))).toMatchObject({
      decisions: [
        { id: 'd-1', reviews: [{ round: 1, reason: 'Who is the team?' }] },
        { id: 'd-2', reviews: [] },
      ],
    })
  })

  it('shows every round of a decision on the page after Nick has asked again', () => {
    const home = homeWithExportJob()
    post(home, `${padApi}/decisions/d-1/request-changes`, {
      page: 'invoice-decisions',
      reason: 'Who is the team?',
    })
    const folder = chooseScratchPad(home, exportJobPadName)
    reopenItem(folder, 'd-1', 'Named the team.', unservedLinks)
    post(home, `${padApi}/decisions/d-1/request-changes`, {
      page: 'invoice-decisions',
      reason: 'Which person?',
    })

    expect(jsonBody(get(home, `${padApi}/pages/invoice-decisions.md`))).toMatchObject({
      decisions: [
        {
          id: 'd-1',
          reviews: [
            { round: 1, reason: 'Who is the team?', outcome: 'Named the team.' },
            { round: 2, reason: 'Which person?', outcome: undefined },
          ],
        },
        { id: 'd-2', reviews: [] },
      ],
    })
  })

  it('returns the open decisions and the reviews when the decisions are asked for', () => {
    const home = homeWithExportJob()
    post(home, `${padApi}/decisions/d-1/request-changes`, {
      page: 'invoice-decisions',
      reason: 'No.',
    })

    expect(jsonBody(get(home, `${padApi}/decisions`))).toMatchObject({
      open: [{ id: 'd-2', question: taxQuestion }],
      reviews: [{ id: 'd-1', reason: 'No.' }],
    })
  })
})

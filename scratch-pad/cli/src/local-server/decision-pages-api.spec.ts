import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { decisionPageTemplate } from '../decision-pages/decision-page'
import { finishedDecisionPage, readyEvent } from '../decision-pages/decision-page-fixtures'
import { writeInvoiceDecisionsPage } from '../nick-views/nick-views-fixtures'
import {
  exportJobPadName,
  exportJobScratchPad,
  freezeClockAt,
  removeTemporaryHomes,
  temporaryHome,
  writeFileInPad,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { respondToApiRequest, UnknownChoiceError, type ApiResponse } from './scratch-pad-api'

const time = '2026-03-14T09:30:00.000Z'
const padApi = `/api/scratch-pads/${exportJobPadName}`
const question = 'How long should a retry wait?'

freezeClockAt(time)

afterEach(() => {
  removeTemporaryHomes()
})

function homeWithDecisionPage(page = finishedDecisionPage('d-4'), ready = true): string {
  const home = temporaryHome()
  const folder = exportJobScratchPad(home)
  writeInvoiceDecisionsPage(folder)
  writeFileInPad(folder, 'pages/2-retry-wait.md', page)
  if (ready) {
    folder.change((pad) => pad.appendEvent(readyEvent('d-4')))
  }
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

describe('the API for a decision page', () => {
  it('returns the options of the decision with the page', () => {
    expect(jsonBody(get(homeWithDecisionPage(), `${padApi}/pages/retry-wait.md`))).toMatchObject({
      page: 'pages/retry-wait.md',
      decisions: [
        {
          id: 'd-4',
          question,
          answer: undefined,
          reviews: [],
          options: [
            { choice: 'option-1', label: 'Option 1: Wait 30 seconds' },
            { choice: 'option-2', label: 'Option 2: Double the wait' },
          ],
        },
      ],
    })
  })

  it('lists the decision in Nick’s Inbox with the decision page as its page', () => {
    expect(jsonBody(get(homeWithDecisionPage(), `${padApi}/nick-inbox`))).toMatchObject({
      decisions: [
        { page: 'pages/retry-wait.md', id: 'd-4', line: 4, question },
        { page: 'pages/invoice-decisions.md', id: 'd-1' },
        { page: 'pages/invoice-decisions.md', id: 'd-2' },
      ],
    })
  })

  it('doesn’t list a draft decision page and shows the page with the status Draft', () => {
    const home = homeWithDecisionPage(finishedDecisionPage('d-4'), false)
    const page = jsonBody(get(home, `${padApi}/pages/retry-wait.md`))

    expect(JSON.stringify(jsonBody(get(home, `${padApi}/nick-inbox`)))).not.toContain('d-4')
    expect(page).toMatchObject({ decisions: [] })
    expect(JSON.stringify(page)).toContain('data-state=\\"draft\\"')
    expect(JSON.stringify(page)).not.toContain('decision-page-decision')
  })

  it('keeps the decision in Nick’s Inbox when the page breaks after it was ready', () => {
    const inbox = jsonBody(
      get(homeWithDecisionPage(decisionPageTemplate('d-4')), `${padApi}/nick-inbox`),
    )

    expect(inbox).toMatchObject({ decisions: [{ id: 'd-4' }, { id: 'd-1' }, { id: 'd-2' }] })
  })

  it('keeps the answer of Nick when the page breaks after he decided', () => {
    const home = homeWithDecisionPage()
    post(home, `${padApi}/decisions/d-4`, { page: 'retry-wait', choice: 'option-2' })
    writeFileSync(
      join(home, exportJobPadName, 'pages/2-retry-wait.md'),
      decisionPageTemplate('d-4'),
    )
    const page = jsonBody(get(home, `${padApi}/pages/retry-wait.md`))

    expect(page).toMatchObject({ decisions: [{ id: 'd-4', answer: { choice: 'option-2' } }] })
    expect(JSON.stringify(page)).toContain('named-block-warning')
    expect(JSON.stringify(jsonBody(get(home, `${padApi}/nick-inbox`)))).not.toContain('d-4')
  })

  it('saves the option that Nick chose and logs the name of the option', () => {
    const home = homeWithDecisionPage()

    expect(
      post(home, `${padApi}/decisions/d-4`, { page: 'retry-wait', choice: 'option-2' }),
    ).toMatchObject({
      status: 200,
      body: {
        decision: { id: 'd-4', page: 'pages/retry-wait.md', answer: { choice: 'option-2' } },
      },
    })
    expect(jsonBody(get(home, `${padApi}/decision-log`))).toMatchObject({
      decisions: [{ text: `${question} Nick chose: Option 2: Double the wait` }],
    })
  })

  it('saves the text that Nick writes', () => {
    expect(
      post(homeWithDecisionPage(), `${padApi}/decisions/d-4`, {
        page: 'retry-wait',
        written: 'Wait 1 minute.',
      }),
    ).toMatchObject({ body: { decision: { answer: { written: 'Wait 1 minute.' } } } })
  })

  it.each([['option-3'], ['proposal'], ['alternative']])(
    'throws UnknownChoiceError when Nick chooses %s on a page with 2 options',
    (choice) => {
      const choose = () =>
        post(homeWithDecisionPage(), `${padApi}/decisions/d-4`, { page: 'retry-wait', choice })

      expect(choose).toThrow(UnknownChoiceError)
      expect(choose).toThrow(
        `Decision d-4 on pages/retry-wait.md doesn't have the choice ${choice}. The choices are option-1, option-2.`,
      )
    },
  )

  it('throws UnknownChoiceError when Nick chooses an option for an inline block', () => {
    const choose = () =>
      post(homeWithDecisionPage(), `${padApi}/decisions/d-1`, {
        page: 'invoice-decisions',
        choice: 'option-1',
      })

    expect(choose).toThrow(
      "Decision d-1 on pages/invoice-decisions.md doesn't have the choice option-1. The choices are proposal, alternative.",
    )
  })

  it('lets Nick request changes on the decision page and takes the decision out of the Inbox', () => {
    const home = homeWithDecisionPage()

    post(home, `${padApi}/decisions/d-4/request-changes`, {
      page: 'retry-wait',
      reason: 'Show the cost of each option.',
    })

    expect(JSON.stringify(jsonBody(get(home, `${padApi}/nick-inbox`)))).not.toContain('d-4')
    expect(jsonBody(get(home, `${padApi}/decisions`))).toMatchObject({
      reviews: [{ id: 'd-4', round: 1, reason: 'Show the cost of each option.' }],
    })
  })
})

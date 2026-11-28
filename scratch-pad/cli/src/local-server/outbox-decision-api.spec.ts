import { afterEach, describe, expect, it } from 'vitest'
import { nickAnswersDecision, nickEditsQueuedItem } from '../nick-actions/nick-actions'
import { NotQueueableError, queueDecision } from '../outbox/outbox'
import {
  exportJobScratchPad,
  removeTemporaryHomes,
  temporaryHome,
  writeFileInPad,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { respondToApiRequest } from './scratch-pad-api'

const decisionPage = `# Retry limit

## Should the job retry 8 times?

:::decision d-1
proposal: Raise the limit to 8.
alternative: Keep the limit at 5.
:::
`

function post(home: string, pad: string, path: string, body: unknown) {
  return respondToApiRequest({
    home,
    method: 'POST',
    path: `/api/scratch-pads/${pad}${path}`,
    body: JSON.stringify(body),
  })
}

function get(home: string, pad: string, path: string) {
  return respondToApiRequest({
    home,
    method: 'GET',
    path: `/api/scratch-pads/${pad}${path}`,
    body: '',
  })
}

afterEach(() => {
  removeTemporaryHomes()
})

describe('queued decisions in the outbox', () => {
  it('queues and replaces a decision answer through the outbox API', () => {
    const home = temporaryHome()
    const folder = exportJobScratchPad(home)
    writeFileInPad(folder, 'pages/1-retry-limit.md', decisionPage)

    const first = post(home, folder.name, '/outbox/decisions/d-1', {
      page: 'pages/retry-limit.md',
      choice: 'proposal',
    })
    const replaced = post(home, folder.name, '/outbox/decisions/d-1', {
      page: 'pages/retry-limit.md',
      written: 'Use 6 retries.',
    })
    const outbox = get(home, folder.name, '/outbox')

    expect([first, replaced]).toMatchObject([
      { kind: 'json', status: 201 },
      { kind: 'json', status: 201 },
    ])
    expect(outbox).toMatchObject({
      kind: 'json',
      status: 200,
      body: {
        items: [
          expect.objectContaining({
            kind: 'decision',
            decision: 'd-1',
            answer: { written: 'Use 6 retries.' },
          }),
        ],
      },
    })
    expect(() => nickEditsQueuedItem(folder, 2, 'New text')).toThrow(NotQueueableError)
  })

  it('sends a queued decision answer when Nick sends the outbox', () => {
    const home = temporaryHome()
    const folder = exportJobScratchPad(home)
    writeFileInPad(folder, 'pages/1-retry-limit.md', decisionPage)
    post(home, folder.name, '/outbox/decisions/d-1', {
      page: 'pages/retry-limit.md',
      written: 'Use 6 retries.',
    })

    const sent = post(home, folder.name, '/outbox/send', {})

    expect(sent).toMatchObject({ kind: 'json', status: 200 })
    expect(folder.read((pad) => pad.readOutbox())).toStrictEqual([])
    expect(folder.read((pad) => pad.readDecisionAnswers())).toMatchObject([
      { id: 'd-1', answer: { written: 'Use 6 retries.' } },
    ])
  })

  it('rejects queuing a decision that is already answered', () => {
    const home = temporaryHome()
    const folder = exportJobScratchPad(home)
    writeFileInPad(folder, 'pages/1-retry-limit.md', decisionPage)
    nickAnswersDecision(folder, {
      id: 'd-1',
      page: 'pages/retry-limit.md',
      line: 5,
      question: 'Should the job retry 8 times?',
      answer: { choice: 'proposal' },
    })

    expect(() =>
      post(home, folder.name, '/outbox/decisions/d-1', {
        page: 'pages/retry-limit.md',
        choice: 'alternative',
      }),
    ).toThrow(/already has your answer/)
  })

  it('omits chosenOption when none is given', () => {
    const item = queueDecision(
      {
        id: 'd-1',
        page: 'pages/retry-limit.md',
        line: 5,
        question: 'Should the job retry 8 times?',
        answer: { choice: 'proposal' },
      },
      '2026-11-28T10:00:00.000Z',
    )
    expect(item.kind === 'decision' && item.chosenOption).toBeUndefined()
  })
})

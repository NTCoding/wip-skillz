import { describe, expect, it } from 'vitest'
import { aDecisionAnswer } from '../decisions/decision-answer-fixtures'
import { trackerWithTasks } from '../progress-tracker/progress-tracker-fixtures'
import { aThread } from '../threads/thread-fixtures'
import { statusText } from './status-text'

const scratchPad = {
  padName: '2026-03-14-export-job',
  padPath: '/pads/2026-03-14-export-job',
  pageAddress: undefined,
  tracker: trackerWithTasks(['done', 'in-progress', 'to-do']),
  nickInbox: { threads: [], decisions: [] },
}

const openDecision = {
  page: 'pages/index.md',
  id: 'd-2',
  line: 9,
  question: 'Will the invoice template show the tax number?',
}

describe('statusText', () => {
  it('prints the scratch pad, the current task and both inboxes', () => {
    expect(
      statusText({
        ...scratchPad,
        threads: [
          aThread({ id: 'c-1' }),
          aThread({ id: 'g-1', type: 'grammar' }),
          aThread({ id: 'g-2', type: 'grammar' }),
          aThread({ id: 'c-2', waitsFor: 'nick' }),
        ],
        decisions: [aDecisionAnswer({})],
        nickInbox: { threads: [aThread({ id: 'c-2', waitsFor: 'nick' })], decisions: [] },
      }),
    ).toBe(
      [
        '2026-03-14-export-job · /pads/2026-03-14-export-job',
        'task 2 of 3: Task about retry 2',
        'waiting for the agent: 1 comment, 1 decision, 2 grammar notes',
        'waiting for Nick: 1 reply',
      ].join('\n'),
    )
  })

  it('prints the address of the scratch pad in the browser when the server runs', () => {
    const address = 'http://127.0.0.1:4747/2026-03-14-export-job/'
    const lines = statusText({
      ...scratchPad,
      pageAddress: address,
      threads: [],
      decisions: [],
    }).split('\n')

    expect(lines[1]).toBe(`in the browser: ${address}`)
  })

  it('prints nothing for both inboxes when nothing waits', () => {
    const lines = statusText({ ...scratchPad, threads: [], decisions: [] }).split('\n')

    expect(lines.slice(2)).toStrictEqual([
      'waiting for the agent: nothing',
      'waiting for Nick: nothing',
    ])
  })

  it('prints replies in the plural when several threads wait for Nick', () => {
    const threads = [
      aThread({ id: 'c-1', waitsFor: 'nick' }),
      aThread({ id: 'c-2', waitsFor: 'nick' }),
    ]
    const nickInbox = { threads, decisions: [] }

    expect(statusText({ ...scratchPad, threads, decisions: [], nickInbox }).split('\n')[3]).toBe(
      'waiting for Nick: 2 replies',
    )
  })

  it('prints the open decisions before the replies when decisions and threads wait for Nick', () => {
    const nickInbox = {
      threads: [aThread({ id: 'c-1', waitsFor: 'nick' })],
      decisions: [openDecision, { ...openDecision, id: 'd-3' }],
    }

    expect(
      statusText({ ...scratchPad, threads: [], decisions: [], nickInbox }).split('\n')[3],
    ).toBe('waiting for Nick: 2 decisions, 1 reply')
  })
})

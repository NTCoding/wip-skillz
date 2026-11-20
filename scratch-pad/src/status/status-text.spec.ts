import { describe, expect, it } from 'vitest'
import { aDecisionAnswer } from '../decisions/decision-answer-fixtures'
import { trackerWithTasks } from '../progress-tracker/progress-tracker-fixtures'
import { aThread } from '../threads/thread-fixtures'
import { statusText } from './status-text'

const scratchPad = {
  padName: '2026-03-14-export-job',
  padPath: '/pads/2026-03-14-export-job',
  tracker: trackerWithTasks(['done', 'in-progress', 'to-do']),
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

    expect(statusText({ ...scratchPad, threads, decisions: [] }).split('\n')[3]).toBe(
      'waiting for Nick: 2 replies',
    )
  })
})

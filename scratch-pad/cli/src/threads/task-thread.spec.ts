import { describe, expect, it } from 'vitest'
import { UnknownTaskIdError } from '../progress-tracker/progress-tracker'
import { trackerWithSubtasks } from '../progress-tracker/progress-tracker-fixtures'
import { assignSubtask } from '../progress-tracker/task-assignments'
import { startTaskThread, TaskThreadExistsError, UnassignedTaskThreadError } from './task-thread'
import { EmptyMessageError } from './thread'
import { aTaskThread, aThread } from './thread-fixtures'

const time = '2026-03-14T10:00:00.000Z'

// Subtask 2.2, whose id is t-5, is assigned to Nick.
const tracker = assignSubtask(
  trackerWithSubtasks(['done', 'in-progress']),
  { task: 2, subtask: 2 },
  { do: 'Check the log of the export job', why: "The agent can't read the log" },
).tracker

describe('startTaskThread', () => {
  it('starts a thread on a subtask of Nick that waits for the agent', () => {
    const thread = startTaskThread([], tracker, {
      task: 't-5',
      text: 'Which log should I check?',
      time,
    })

    expect(thread).toStrictEqual({
      id: 'c-1',
      type: 'comment',
      page: undefined,
      task: 't-5',
      anchor: undefined,
      waitsFor: 'agent',
      outcome: undefined,
      messages: [{ author: 'nick', text: 'Which log should I check?', time }],
    })
  })

  it('gives the thread the next comment id after the ids of the other threads', () => {
    const threads = [aThread({ id: 'c-3' }), aThread({ id: 'g-7', type: 'grammar' })]
    const thread = startTaskThread(threads, tracker, {
      task: 't-5',
      text: 'Which log should I check?',
      time,
    })

    expect(thread.id).toBe('c-4')
  })

  it("throws UnassignedTaskThreadError when the task isn't assigned to Nick", () => {
    const start = () => startTaskThread([], tracker, { task: 't-4', text: 'Done?', time })

    expect(start).toThrow(UnassignedTaskThreadError)
    expect(start).toThrow(
      "Subtask 2.1 isn't assigned to Nick so a thread can't be started on it. A thread can only be started on a task or a subtask that's assigned to Nick.",
    )
  })

  it('throws TaskThreadExistsError when the task already has a thread, even a resolved one', () => {
    const resolved = aTaskThread({ id: 'c-2', waitsFor: 'nobody' })
    const start = () => startTaskThread([resolved], tracker, { task: 't-5', text: 'Hi', time })

    expect(start).toThrow(TaskThreadExistsError)
    expect(start).toThrow('Subtask 2.2 already has the thread c-2. Reply to c-2 instead.')
  })

  it("throws UnknownTaskIdError when the task isn't on the progress tracker", () => {
    const start = () => startTaskThread([], tracker, { task: 't-9', text: 'Hi', time })

    expect(start).toThrow(UnknownTaskIdError)
  })

  it('throws EmptyMessageError when the first message is empty', () => {
    const start = () => startTaskThread([], tracker, { task: 't-5', text: '  ', time })

    expect(start).toThrow(EmptyMessageError)
  })
})

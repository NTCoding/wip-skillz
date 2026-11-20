import { afterEach, describe, expect, it } from 'vitest'
import { UnknownPageError } from '../pages/page-markdown'
import {
  exportJobScratchPad,
  freezeClockAt,
  removeTemporaryHomes,
  temporaryHome,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { retryAnchor } from '../threads/thread-fixtures'
import { nickAnswersDecision, nickComments, nickReplies, nickResolves } from './nick-actions'

const time = '2026-03-14T09:30:00.000Z'
const question = 'Will the invoice template show the tax number?'

freezeClockAt(time)

afterEach(() => {
  removeTemporaryHomes()
})

function commentOn(folder: ReturnType<typeof exportJobScratchPad>) {
  return nickComments(folder, {
    type: 'comment',
    page: 'index',
    anchor: retryAnchor,
    text: 'Is 5 retries enough on a slow network?',
  })
}

describe('nickComments', () => {
  it('saves a thread that waits for the agent on the page that was found', () => {
    const folder = exportJobScratchPad(temporaryHome())

    commentOn(folder)

    expect(folder.readThread('c-1')).toStrictEqual({
      id: 'c-1',
      type: 'comment',
      page: 'pages/index.md',
      anchor: retryAnchor,
      waitsFor: 'agent',
      outcome: undefined,
      messages: [{ author: 'nick', text: 'Is 5 retries enough on a slow network?', time }],
    })
  })

  it('gives each new thread of a type the next id of that type', () => {
    const folder = exportJobScratchPad(temporaryHome())
    commentOn(folder)

    const note = nickComments(folder, {
      type: 'improvement',
      page: 'pages/index.md',
      anchor: undefined,
      text: 'Add an example.',
    })

    expect([commentOn(folder).id, note.id]).toStrictEqual(['c-2', 'i-1'])
  })

  it('appends a thread-opened event by Nick', () => {
    const folder = exportJobScratchPad(temporaryHome())

    commentOn(folder)

    expect(folder.readEvents()).toStrictEqual([
      { number: 1, time, kind: 'thread-opened', by: 'nick', item: 'c-1' },
    ])
  })

  it('throws UnknownPageError when the page does not exist', () => {
    const folder = exportJobScratchPad(temporaryHome())
    const comment = () =>
      nickComments(folder, { type: 'comment', page: 'invoice', anchor: retryAnchor, text: 'x' })

    expect(comment).toThrow(UnknownPageError)
    expect(comment).toThrow("There isn't any page called invoice in 2026-03-14-export-job.")
  })
})

describe('nickReplies', () => {
  it('saves the reply of Nick after the earlier messages', () => {
    const folder = exportJobScratchPad(temporaryHome())
    commentOn(folder)

    nickReplies(folder, 'c-1', 'And what about 8?')

    expect(folder.readThread('c-1').messages).toStrictEqual([
      { author: 'nick', text: 'Is 5 retries enough on a slow network?', time },
      { author: 'nick', text: 'And what about 8?', time },
    ])
  })

  it('makes the thread wait for the agent when the thread waited for Nick', () => {
    const folder = exportJobScratchPad(temporaryHome())
    folder.writeThread({ ...commentOn(folder), waitsFor: 'nick' })

    nickReplies(folder, 'c-1', 'And what about 8?')

    expect(folder.readThread('c-1').waitsFor).toBe('agent')
  })

  it('appends a thread-replied event by Nick', () => {
    const folder = exportJobScratchPad(temporaryHome())
    commentOn(folder)

    nickReplies(folder, 'c-1', 'And what about 8?')

    expect(folder.readEvents().at(-1)).toStrictEqual({
      number: 2,
      time,
      kind: 'thread-replied',
      by: 'nick',
      item: 'c-1',
    })
  })
})

describe('nickResolves', () => {
  it('saves the thread as waiting for nobody', () => {
    const folder = exportJobScratchPad(temporaryHome())
    commentOn(folder)

    nickResolves(folder, 'c-1')

    expect(folder.readThread('c-1').waitsFor).toBe('nobody')
  })

  it('appends a thread-resolved event by Nick', () => {
    const folder = exportJobScratchPad(temporaryHome())
    commentOn(folder)

    nickResolves(folder, 'c-1')

    expect(folder.readEvents().at(-1)).toStrictEqual({
      number: 2,
      time,
      kind: 'thread-resolved',
      by: 'nick',
      item: 'c-1',
    })
  })
})

describe('nickAnswersDecision', () => {
  it('saves the answer as not seen by the agent', () => {
    const folder = exportJobScratchPad(temporaryHome())

    nickAnswersDecision(folder, {
      page: 'index',
      line: 9,
      question,
      answer: { choice: 'proposal' },
    })

    expect(folder.readDecisionAnswer('d-1')).toStrictEqual({
      id: 'd-1',
      page: 'pages/index.md',
      line: 9,
      question,
      answer: { choice: 'proposal' },
      seenByAgent: false,
      time,
    })
  })

  it('logs the decision from the page with the question and the answer', () => {
    const folder = exportJobScratchPad(temporaryHome())

    nickAnswersDecision(folder, {
      page: 'index',
      line: 9,
      question,
      answer: { written: 'Only for companies.' },
    })

    expect(folder.readDecisionLog()).toStrictEqual([
      {
        number: 1,
        time,
        source: 'page',
        text: `${question} Nick wrote: Only for companies.`,
        decision: 'd-1',
      },
    ])
  })

  it('replaces the saved answer and keeps its id when Nick changes the answer', () => {
    const folder = answeredThenChanged()

    expect(folder.readDecisionAnswers()).toStrictEqual([
      {
        id: 'd-1',
        page: 'pages/index.md',
        line: 11,
        question,
        answer: { choice: 'alternative' },
        seenByAgent: false,
        time,
      },
    ])
  })

  it('makes the answer unseen by the agent again when Nick changes the answer', () => {
    expect(answeredThenChanged().readDecisionAnswer('d-1').seenByAgent).toBe(false)
  })

  it('keeps one log entry for the decision when Nick changes the answer', () => {
    expect(answeredThenChanged().readDecisionLog()).toStrictEqual([
      {
        number: 1,
        time,
        source: 'page',
        text: `${question} Nick chose: alternative`,
        decision: 'd-1',
      },
    ])
  })

  it('gives a different question the next decision id', () => {
    const folder = exportJobScratchPad(temporaryHome())
    nickAnswersDecision(folder, {
      page: 'index',
      line: 9,
      question,
      answer: { choice: 'proposal' },
    })

    const second = nickAnswersDecision(folder, {
      page: 'index',
      line: 20,
      question: 'Will the retry limit be 8?',
      answer: { choice: 'proposal' },
    })

    expect(second.id).toBe('d-2')
  })

  it('appends a decision-answered event by Nick', () => {
    const folder = exportJobScratchPad(temporaryHome())

    nickAnswersDecision(folder, {
      page: 'index',
      line: 9,
      question,
      answer: { choice: 'proposal' },
    })

    expect(folder.readEvents()).toStrictEqual([
      { number: 1, time, kind: 'decision-answered', by: 'nick', item: 'd-1' },
    ])
  })
})

function answeredThenChanged() {
  const folder = exportJobScratchPad(temporaryHome())
  nickAnswersDecision(folder, {
    page: 'index',
    line: 9,
    question,
    answer: { choice: 'proposal' },
  })
  folder.writeDecisionAnswer({ ...folder.readDecisionAnswer('d-1'), seenByAgent: true })
  nickAnswersDecision(folder, {
    page: 'index',
    line: 11,
    question,
    answer: { choice: 'alternative' },
  })
  return folder
}

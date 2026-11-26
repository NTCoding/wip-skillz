import { describe, expect, it } from 'vitest'
import {
  ClosedThreadError,
  EmptyMessageError,
  EmptyOutcomeError,
  InvalidAnchorError,
  MissingAnchorError,
  NotANoteError,
  addAgentMessage,
  addNickMessage,
  finishNote,
  lastMessage,
  messagesSinceAgentReply,
  openThread,
  resolveThread,
} from './thread'
import { aTaskThread, aThread, retryAnchor } from './thread-fixtures'

const time = '2026-03-14T10:00:00.000Z'

describe('openThread', () => {
  it('opens a thread that waits for the agent with the first message of Nick', () => {
    const thread = openThread({
      id: 'c-1',
      type: 'comment',
      page: 'pages/index.md',
      anchor: retryAnchor,
      text: 'Is 5 retries enough?',
      time,
    })

    expect(thread).toStrictEqual({
      id: 'c-1',
      type: 'comment',
      page: 'pages/index.md',
      anchor: retryAnchor,
      waitsFor: 'agent',
      outcome: undefined,
      messages: [{ author: 'nick', text: 'Is 5 retries enough?', time }],
    })
  })

  it('opens an improvement note without an anchor', () => {
    const thread = openThread({
      id: 'i-1',
      type: 'improvement',
      page: 'pages/index.md',
      anchor: undefined,
      text: 'Add an example of a failed export.',
      time,
    })

    expect(thread.anchor).toBeUndefined()
  })

  it.each(['comment', 'grammar'] as const)(
    'throws MissingAnchorError when a %s has no anchor',
    (type) => {
      const open = () =>
        openThread({ id: 'c-1', type, page: 'pages/index.md', anchor: undefined, text: 'x', time })

      expect(open).toThrow(MissingAnchorError)
      expect(open).toThrow(
        'needs an anchor with the first line, the last line and the selected text',
      )
    },
  )

  it.each([
    { firstLine: 0, lastLine: 2 },
    { firstLine: 4, lastLine: 3 },
  ])('throws InvalidAnchorError when the anchor is $firstLine-$lastLine', (lines) => {
    const open = () =>
      openThread({
        id: 'c-1',
        type: 'comment',
        page: 'pages/index.md',
        anchor: { ...lines, selectedText: 'retries', prefix: '', suffix: '' },
        text: 'x',
        time,
      })

    expect(open).toThrow(InvalidAnchorError)
    expect(open).toThrow(`The anchor ${lines.firstLine}-${lines.lastLine} is invalid.`)
  })

  it('throws EmptyMessageError when the text is only whitespace', () => {
    const open = () =>
      openThread({
        id: 'c-1',
        type: 'comment',
        page: 'pages/index.md',
        anchor: retryAnchor,
        text: '  \n ',
        time,
      })

    expect(open).toThrow(EmptyMessageError)
    expect(open).toThrow('The message is empty.')
  })
})

describe('addNickMessage', () => {
  it('makes the thread wait for the agent when Nick replies', () => {
    const thread = addNickMessage(aThread({ waitsFor: 'nick' }), 'Make it 8 then.', time)

    expect(thread.waitsFor).toBe('agent')
  })

  it('reopens a done note and removes its outcome when Nick replies', () => {
    const done = aThread({ type: 'grammar', waitsFor: 'nobody', outcome: 'Fixed the comma.' })

    const thread = addNickMessage(done, 'The comma is still there.', time)

    expect([thread.waitsFor, thread.outcome]).toStrictEqual(['agent', undefined])
  })

  it('adds the message of Nick after the existing messages', () => {
    const thread = addNickMessage(aThread({}), 'Make it 8 then.', time)

    expect(thread.messages.at(-1)).toStrictEqual({ author: 'nick', text: 'Make it 8 then.', time })
  })
})

describe('addAgentMessage', () => {
  it('makes the thread wait for Nick when the agent replies', () => {
    const thread = addAgentMessage(aThread({}), 'I have raised the limit to 8.', time)

    expect(thread.waitsFor).toBe('nick')
  })

  it('adds the message of the agent after the existing messages', () => {
    const thread = addAgentMessage(aThread({}), 'I have raised the limit to 8.', time)

    expect(thread.messages.at(-1)).toStrictEqual({
      author: 'agent',
      text: 'I have raised the limit to 8.',
      time,
    })
  })

  it('throws ClosedThreadError when the thread waits for nobody', () => {
    const reply = () => addAgentMessage(aThread({ waitsFor: 'nobody' }), 'One more thing.', time)

    expect(reply).toThrow(ClosedThreadError)
    expect(reply).toThrow(
      "c-1 is closed so the agent can't reply to it or mark it as done. Nick can reopen it with a reply on its card in the browser.",
    )
  })
})

describe('resolveThread', () => {
  it('makes the thread wait for nobody', () => {
    expect(resolveThread(aThread({})).waitsFor).toBe('nobody')
  })
})

describe('finishNote', () => {
  it('closes a grammar note with the trimmed outcome', () => {
    const thread = finishNote(aThread({ id: 'g-1', type: 'grammar' }), ' Removed the comma. ')

    expect([thread.waitsFor, thread.outcome]).toStrictEqual(['nobody', 'Removed the comma.'])
  })

  it('throws NotANoteError when the thread is a comment', () => {
    const finish = () => finishNote(aThread({}), 'Changed it.')

    expect(finish).toThrow(NotANoteError)
    expect(finish).toThrow('c-1 is a comment. Only a grammar note or an improvement note')
  })

  it('throws NotANoteError when the thread is on a task', () => {
    const finish = () => finishNote(aTaskThread({}), 'Changed it.')

    expect(finish).toThrow(NotANoteError)
    expect(finish).toThrow('c-4 is a comment.')
  })

  it('throws ClosedThreadError when the note is already done', () => {
    const done = aThread({ id: 'g-1', type: 'grammar', waitsFor: 'nobody', outcome: 'Fixed.' })
    const finish = () => finishNote(done, 'Something else entirely.')

    expect(finish).toThrow(ClosedThreadError)
    expect(finish).toThrow("g-1 is closed so the agent can't reply to it or mark it as done.")
  })

  it('throws EmptyOutcomeError when the outcome is blank', () => {
    const finish = () => finishNote(aThread({ id: 'i-1', type: 'improvement' }), '   ')

    expect(finish).toThrow(EmptyOutcomeError)
    expect(finish).toThrow('The outcome is empty.')
  })
})

describe('lastMessage', () => {
  it('returns the only message when the thread has one message', () => {
    expect(lastMessage(aThread({}))).toStrictEqual(aThread({}).messages[0])
  })

  it('returns the last message when the thread has several messages', () => {
    const thread = aThread({
      messages: [
        { author: 'nick', text: 'Is 5 enough?', time },
        { author: 'agent', text: 'Yes, for a fast network.', time },
      ],
    })

    expect(lastMessage(thread)).toStrictEqual({
      author: 'agent',
      text: 'Yes, for a fast network.',
      time,
    })
  })
})

describe('messagesSinceAgentReply', () => {
  it('returns every message when the agent has not replied yet', () => {
    const messages = [
      { author: 'nick', text: 'Is 5 enough?', time },
      { author: 'nick', text: 'And for a slow network?', time },
    ] as const

    expect(messagesSinceAgentReply(aThread({ messages }))).toStrictEqual(messages)
  })

  it('returns only the messages after the last reply of the agent', () => {
    const thread = aThread({
      messages: [
        { author: 'nick', text: 'Is 5 enough?', time },
        { author: 'agent', text: 'Yes, for a fast network.', time },
        { author: 'nick', text: 'And for a slow one?', time },
      ],
    })

    expect(messagesSinceAgentReply(thread)).toStrictEqual([
      { author: 'nick', text: 'And for a slow one?', time },
    ])
  })
})

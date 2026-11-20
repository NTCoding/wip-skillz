import { afterEach, describe, expect, it } from 'vitest'
import { PadDbFailureError } from '../scratch-pad-folder/scratch-pad-folder'
import {
  exportJobScratchPad,
  freezeClockAt,
  refuseNewEvents,
  removeTemporaryHomes,
  temporaryHome,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { commentAndGrammarNoteAndDecision } from './agent-commands-fixtures'
import { DecisionReplyError, finishNoteThread, replyToThread, showItem } from './thread-commands'

const time = '2026-03-14T09:30:00.000Z'

freezeClockAt(time)

afterEach(() => {
  removeTemporaryHomes()
})

function preparedScratchPad() {
  const folder = exportJobScratchPad(temporaryHome())
  commentAndGrammarNoteAndDecision(folder)
  return folder
}

describe('showItem', () => {
  it('prints the whole thread with its block', () => {
    expect(showItem(preparedScratchPad(), 'c-1')).toBe(
      [
        '[c-1] comment · pages/index.md:5-6 · section "Retry policy" · waits for the agent',
        '  selected: "The export job retries 5 times."',
        '  block:',
        '    5 | The export job retries 5 times.',
        '    6 | Each retry waits 30 seconds.',
        '  Nick (2026-03-14 09:30): Is 5 retries enough on a slow network?',
      ].join('\n'),
    )
  })

  it('prints a decision answer', () => {
    expect(showItem(preparedScratchPad(), 'd-1')).toBe(
      [
        '[d-1] decision · pages/index.md:9 · "Will the invoice template show the tax number?" · waits for the agent',
        '  Nick chose: proposal',
      ].join('\n'),
    )
  })
})

describe('replyToThread', () => {
  it('prints that the thread now waits for Nick', () => {
    expect(replyToThread(preparedScratchPad(), 'c-1', 'I raised the limit to 8.')).toBe(
      'c-1 now waits for Nick',
    )
  })

  it('saves the reply of the agent', () => {
    const folder = preparedScratchPad()

    replyToThread(folder, 'c-1', 'I raised the limit to 8.')

    expect(folder.read((pad) => pad.readThread('c-1')).messages.at(-1)).toStrictEqual({
      author: 'agent',
      text: 'I raised the limit to 8.',
      time,
    })
  })

  it('appends a thread-replied event by the agent', () => {
    const folder = preparedScratchPad()

    replyToThread(folder, 'c-1', 'I raised the limit to 8.')

    expect(folder.read((pad) => pad.readEvents()).at(-1)).toStrictEqual({
      number: 4,
      time,
      kind: 'thread-replied',
      by: 'agent',
      item: 'c-1',
    })
  })

  it('saves no reply when the event of the reply cannot be saved', () => {
    const folder = preparedScratchPad()
    refuseNewEvents(folder)

    expect(() => replyToThread(folder, 'c-1', 'I raised the limit to 8.')).toThrow(
      PadDbFailureError,
    )
    expect(folder.read((pad) => pad.readThread('c-1').messages)).toHaveLength(1)
  })

  it('throws DecisionReplyError when the id is a decision', () => {
    const folder = preparedScratchPad()

    expect(() => replyToThread(folder, 'd-1', 'Noted.')).toThrow(DecisionReplyError)
    expect(() => replyToThread(folder, 'd-1', 'Noted.')).toThrow(
      'd-1 is a decision. Only a thread can be replied to or be done.',
    )
  })
})

describe('finishNoteThread', () => {
  it('prints that the note is done', () => {
    expect(finishNoteThread(preparedScratchPad(), 'g-1', 'Changed the verb.')).toBe('g-1 is done')
  })

  it('saves the outcome of the note', () => {
    const folder = preparedScratchPad()

    finishNoteThread(folder, 'g-1', 'Changed "waits" to "waits for".')

    expect(folder.read((pad) => pad.readThread('g-1')).outcome).toBe(
      'Changed "waits" to "waits for".',
    )
  })

  it('appends a note-done event by the agent', () => {
    const folder = preparedScratchPad()

    finishNoteThread(folder, 'g-1', 'Changed the verb.')

    expect(folder.read((pad) => pad.readEvents()).at(-1)?.kind).toBe('note-done')
  })
})

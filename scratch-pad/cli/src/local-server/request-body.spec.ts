import { describe, expect, it } from 'vitest'
import {
  answerRequestFrom,
  commentRequestFrom,
  improvementEditFrom,
  InvalidRequestBodyError,
  jsonObjectFrom,
  longestMessage,
  RequestBody,
} from './request-body'

const anchorOnRetry = {
  firstLine: 5,
  lastLine: 6,
  selectedText: 'retries 5 times.',
  prefix: 'The export job',
  suffix: 'Each retry waits 30 seconds.',
}

function commentBody(fields: Record<string, unknown>): RequestBody {
  return RequestBody.parse(
    JSON.stringify({ type: 'comment', page: 'pages/index.md', message: 'Why 5?', ...fields }),
  )
}

describe('RequestBody.parse', () => {
  it.each(['[1, 2]', '"retry"', 'null'])(
    'throws InvalidRequestBodyError when the JSON is %s',
    (text) => {
      expect(() => RequestBody.parse(text)).toThrow(InvalidRequestBodyError)
      expect(() => RequestBody.parse(text)).toThrow(
        'The body of the request is invalid: it must be a JSON object.',
      )
    },
  )

  it('throws InvalidRequestBodyError when the body is not JSON', () => {
    expect(() => RequestBody.parse('retry=5')).toThrow(InvalidRequestBodyError)
    expect(() => RequestBody.parse('retry=5')).toThrow(
      "The body of the request is invalid: it isn't JSON.",
    )
  })
})

describe('RequestBody', () => {
  it('returns undefined when an optional field is null', () => {
    const body = RequestBody.parse('{"selectedText": null, "firstLine": null}')

    expect([
      body.optionalText('selectedText'),
      body.optionalWholeNumber('firstLine'),
    ]).toStrictEqual([undefined, undefined])
  })

  it('throws InvalidRequestBodyError when a text field is a number', () => {
    const body = RequestBody.parse('{"message": 5}')

    expect(() => body.text('message')).toThrow(InvalidRequestBodyError)
    expect(() => body.text('message')).toThrow('"message" must be a text')
  })

  it.each(['"5"', '5.5'])(
    'throws InvalidRequestBodyError when a whole number field is %s',
    (value) => {
      const body = RequestBody.parse(`{"firstLine": ${value}}`)

      expect(() => body.optionalWholeNumber('firstLine')).toThrow(InvalidRequestBodyError)
      expect(() => body.optionalWholeNumber('firstLine')).toThrow(
        '"firstLine" must be a whole number',
      )
    },
  )
})

describe('jsonObjectFrom', () => {
  it('returns the fields when the value is an object', () => {
    expect(jsonObjectFrom({ home: '/pads' })).toStrictEqual({ home: '/pads' })
  })
})

describe('commentRequestFrom', () => {
  it('returns the comment with its anchor when the body has the lines and the selected text', () => {
    expect(commentRequestFrom(commentBody(anchorOnRetry))).toStrictEqual({
      type: 'comment',
      page: 'pages/index.md',
      anchor: anchorOnRetry,
      text: 'Why 5?',
    })
  })

  it('returns the note without an anchor when the body has no lines and no selected text', () => {
    expect(commentRequestFrom(commentBody({ type: 'improvement' })).anchor).toBeUndefined()
  })

  it.each([
    { firstLine: 5 },
    { lastLine: 6 },
    { selectedText: 'retries' },
    { firstLine: 5, lastLine: 6 },
    { firstLine: 5, selectedText: 'retries' },
    { firstLine: 5, lastLine: 6, selectedText: 'retries', prefix: '' },
    { suffix: '' },
  ])('throws InvalidRequestBodyError when only some of the anchor is given in %j', (anchor) => {
    expect(() => commentRequestFrom(commentBody(anchor))).toThrow(InvalidRequestBodyError)
    expect(() => commentRequestFrom(commentBody(anchor))).toThrow(
      '"firstLine", "lastLine", "selectedText", "prefix" and "suffix" must be given together',
    )
  })

  it('throws InvalidRequestBodyError when the type is not a type of thread', () => {
    expect(() => commentRequestFrom(commentBody({ type: 'decision' }))).toThrow(
      InvalidRequestBodyError,
    )
    expect(() => commentRequestFrom(commentBody({ type: 'decision' }))).toThrow(
      '"type" must be one of comment, grammar, improvement',
    )
  })

  it('returns the message when the message has exactly 10,000 characters', () => {
    const message = 'a'.repeat(longestMessage)
    expect(commentRequestFrom(commentBody({ message })).text).toBe(message)
  })

  it('throws InvalidRequestBodyError when the message is longer than 10,000 characters', () => {
    const message = 'a'.repeat(longestMessage + 1)
    expect(() => commentRequestFrom(commentBody({ message }))).toThrow(InvalidRequestBodyError)
    expect(() => commentRequestFrom(commentBody({ message }))).toThrow(
      '"message" has 10001 characters, but a message can\'t be longer than 10000 characters',
    )
  })

  it('throws InvalidRequestBodyError when the message is missing', () => {
    expect(() => commentRequestFrom(commentBody({ message: undefined }))).toThrow(
      InvalidRequestBodyError,
    )
    expect(() => commentRequestFrom(commentBody({ message: undefined }))).toThrow(
      '"message" is missing',
    )
  })
})

describe('answerRequestFrom', () => {
  it('throws InvalidRequestBodyError when the written answer is longer than 10,000 characters', () => {
    const body = RequestBody.parse(
      JSON.stringify({ page: 'pages/index.md', written: 'a'.repeat(longestMessage + 1) }),
    )
    expect(() => answerRequestFrom(body)).toThrow(InvalidRequestBodyError)
    expect(() => answerRequestFrom(body)).toThrow('"written" has 10001 characters')
  })

  it('returns the choice when the body has a choice', () => {
    expect(
      answerRequestFrom(RequestBody.parse('{"page": "pages/index.md", "choice": "alternative"}')),
    ).toStrictEqual({ page: 'pages/index.md', answer: { choice: 'alternative' } })
  })

  it('returns the written answer when the body has a written answer', () => {
    expect(
      answerRequestFrom(
        RequestBody.parse('{"page": "pages/index.md", "written": "Retry 6 times."}'),
      ),
    ).toStrictEqual({ page: 'pages/index.md', answer: { written: 'Retry 6 times.' } })
  })

  it.each([
    '{"page": "pages/index.md"}',
    '{"page": "pages/index.md", "choice": "pick"}',
    '{"page": "pages/index.md", "choice": "proposal", "written": "Retry 6 times."}',
  ])('throws InvalidRequestBodyError when the body is %s', (text) => {
    expect(() => answerRequestFrom(RequestBody.parse(text))).toThrow(InvalidRequestBodyError)
    expect(() => answerRequestFrom(RequestBody.parse(text))).toThrow(
      'it needs either "choice" with proposal or alternative, or "written" with the answer',
    )
  })
})

describe('improvementEditFrom', () => {
  it('returns the title and the details of the edit', () => {
    expect(
      improvementEditFrom(
        RequestBody.parse('{"title": "The export skips files.", "details": "Run it."}'),
      ),
    ).toStrictEqual({ title: 'The export skips files.', details: 'Run it.' })
  })

  it('returns the edit without details when the details are null', () => {
    expect(
      improvementEditFrom(
        RequestBody.parse('{"title": "The export skips files.", "details": null}'),
      ),
    ).toStrictEqual({ title: 'The export skips files.', details: undefined })
  })

  it('throws InvalidRequestBodyError when the title is missing', () => {
    expect(() => improvementEditFrom(RequestBody.parse('{"details": "Run it."}'))).toThrow(
      '"title" is missing',
    )
  })
})

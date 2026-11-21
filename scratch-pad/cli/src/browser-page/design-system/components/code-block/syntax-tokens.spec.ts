import { describe, expect, it } from 'vitest'
import { syntaxLines, syntaxTokens } from './syntax-tokens'

describe('syntaxTokens', () => {
  it('returns the whole code as plain text when the language is Markdown', () => {
    expect(syntaxTokens('# Retry limit', 'md')).toStrictEqual([
      { kind: 'plain', text: '# Retry limit' },
    ])
  })

  it('returns the whole code as plain text when there is no language', () => {
    expect(syntaxTokens('retry limit: 5', undefined)).toStrictEqual([
      { kind: 'plain', text: 'retry limit: 5' },
    ])
  })

  it('marks keywords, types, functions, strings, numbers and punctuation when the language is ts', () => {
    expect(syntaxTokens("const limit: Retry = retries('shop', 5)", 'ts')).toStrictEqual([
      { kind: 'keyword', text: 'const' },
      { kind: 'plain', text: ' ' },
      { kind: 'plain', text: 'limit' },
      { kind: 'punct', text: ':' },
      { kind: 'plain', text: ' ' },
      { kind: 'type', text: 'Retry' },
      { kind: 'plain', text: ' ' },
      { kind: 'punct', text: '=' },
      { kind: 'plain', text: ' ' },
      { kind: 'fn', text: 'retries' },
      { kind: 'punct', text: '(' },
      { kind: 'string', text: "'shop'" },
      { kind: 'punct', text: ',' },
      { kind: 'plain', text: ' ' },
      { kind: 'number', text: '5' },
      { kind: 'punct', text: ')' },
    ])
  })

  it('marks a line that starts with # as a comment when the language is sh', () => {
    expect(syntaxTokens('# export one shop', 'SH')).toStrictEqual([
      { kind: 'comment', text: '# export one shop' },
    ])
  })

  it('marks // and /* */ as comments when the language is a C-like one', () => {
    expect(syntaxTokens('/* a */ // b', 'go').map((token) => token.kind)).toStrictEqual([
      'comment',
      'plain',
      'comment',
    ])
  })
})

describe('syntaxLines', () => {
  it('splits a token that spans 2 lines when the code has a comment over 2 lines', () => {
    const lines = syntaxLines(syntaxTokens('/* first\nsecond */\nx', 'ts'))
    expect(lines).toStrictEqual([
      [{ kind: 'comment', text: '/* first' }],
      [{ kind: 'comment', text: 'second */' }],
      [{ kind: 'plain', text: 'x' }],
    ])
  })

  it('keeps an empty line when the code has a blank line', () => {
    expect(syntaxLines([{ kind: 'plain', text: 'a\n\nb' }])).toStrictEqual([
      [{ kind: 'plain', text: 'a' }],
      [],
      [{ kind: 'plain', text: 'b' }],
    ])
  })
})

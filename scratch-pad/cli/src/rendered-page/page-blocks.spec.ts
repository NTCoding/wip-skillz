import { describe, expect, it } from 'vitest'
import {
  visibleBlockTexts,
  visibleTextHtml,
  visibleTextMarkdown,
} from '../browser-page/visible-text-fixtures'
import { normalisedText, pageBlocksOf } from './page-blocks'
import { renderPage } from './rendered-page'

describe('pageBlocksOf', () => {
  it('returns the same text as the browser for each block when the page has a table, lists, code and a quote', () => {
    const html = renderPage({
      page: 'pages/index.md',
      markdown: visibleTextMarkdown,
      readCustomFile: () => undefined,
    }).html
    const texts = Object.fromEntries(
      pageBlocksOf(visibleTextMarkdown).map((block) => [
        `${block.firstLine}-${block.lastLine}`,
        block.text,
      ]),
    )
    expect({ html, texts }).toStrictEqual({ html: visibleTextHtml, texts: visibleBlockTexts })
  })

  it('returns the lines and the visible text of each top level block', () => {
    const markdown = [
      '# Invoice *export*',
      '',
      'The job retries `5` times  ',
      'and then [stops](#stop) &amp; logs ![a chart](chart.svg).',
      '',
      '- Bakery',
      '- Florist',
    ].join('\n')
    expect(pageBlocksOf(markdown)).toStrictEqual([
      { firstLine: 1, lastLine: 1, text: 'Invoice export' },
      { firstLine: 3, lastLine: 4, text: 'The job retries 5 times and then stops & logs .' },
      { firstLine: 6, lastLine: 7, text: 'Bakery Florist' },
    ])
  })

  it('returns the content of code blocks and named blocks when the page has them', () => {
    const markdown = [
      '```ts',
      'const retries = 5',
      '```',
      '',
      '    indented code',
      '',
      ':::decision',
      'Proposal: retry 8 times',
      ':::',
      '',
      '---',
    ].join('\n')
    expect(pageBlocksOf(markdown).map((block) => block.text)).toStrictEqual([
      'const retries = 5',
      'indented code',
      'Proposal: retry 8 times',
      '',
    ])
  })
})

describe('normalisedText', () => {
  it('returns one space between words when the text has line breaks and tabs', () => {
    expect(normalisedText('  The job\n\tretries  ')).toBe('The job retries')
  })
})

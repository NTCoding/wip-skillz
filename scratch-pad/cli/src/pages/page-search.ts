import { type Heading } from '../rendered-page/page-headings'
import {
  firstWordOf,
  namedBlockType,
  pageMarkdownParser,
} from '../rendered-page/page-markdown-parser'

// The search reads the Markdown of every page in the form it was written by the agent. So a match
// can be in the address of a link or in a code block too. The only part that the search skips is
// a :::decision block, from its :::decision line to its closing ::: line.

export interface SearchedPage {
  readonly page: string
  readonly title: string | undefined
  readonly markdown: string
  // The headings with the ids that the browser scrolls to, including the headings that the server
  // adds to the index page
  readonly headings: readonly Heading[]
}

interface MatchInSnippet {
  readonly start: number
  readonly end: number
}

// One result for each line that contains the query. A match before the first heading of the page
// is shown under the title of the page. That result doesn't have a heading id, because the browser
// scrolls to the top of the page then.
export interface SearchResult {
  readonly page: string
  readonly heading: string | undefined
  readonly headingId: string | undefined
  readonly snippet: string
  readonly matches: readonly MatchInSnippet[]
}

// A snippet starts at most this many characters before the first match of its line. The rest of a
// long line is cut by the browser.
const textBeforeMatch = 40
const cutMark = '…'

export function searchResultsOf(pages: readonly SearchedPage[], query: string): SearchResult[] {
  if (query.trim() === '') {
    return []
  }
  const pattern = new RegExp(query.replaceAll(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`), 'giu')
  return pages.flatMap((page) => {
    const skipped = decisionLines(page.markdown)
    return page.markdown.split('\n').flatMap((text, index) => {
      const line = index + 1
      const found = skipped.has(line) ? [] : [...text.matchAll(pattern)]
      if (found.length === 0) {
        return []
      }
      const heading = page.headings.findLast((each) => each.line <= line)
      return [
        {
          page: page.page,
          heading: heading?.text ?? page.title,
          headingId: heading?.id,
          ...snippetOf(text, found),
        },
      ]
    })
  })
}

function decisionLines(markdown: string): Set<number> {
  return new Set(
    pageMarkdownParser
      .parse(markdown, {})
      .flatMap((token) =>
        token.type === namedBlockType &&
        firstWordOf(token.info) === 'decision' &&
        token.map !== null
          ? linesBetween(token.map[0] + 1, token.map[1])
          : [],
      ),
  )
}

function linesBetween(first: number, last: number): number[] {
  return Array.from({ length: last - first + 1 }, (_, offset) => first + offset)
}

function snippetOf(
  text: string,
  found: readonly RegExpExecArray[],
): Pick<SearchResult, 'snippet' | 'matches'> {
  const first = Math.min(...found.map((match) => match.index))
  const indent = text.length - text.trimStart().length
  const start = first - indent > textBeforeMatch ? wordStartBefore(text, first) : indent
  const mark = start === indent ? '' : cutMark
  return {
    snippet: `${mark}${text.slice(start)}`,
    matches: found.map((match) => ({
      start: match.index - start + mark.length,
      end: match.index - start + mark.length + match[0].length,
    })),
  }
}

// A snippet that is cut starts at the start of a word. If the word is longer than the text that
// the snippet shows before the match, the snippet starts inside the word.
function wordStartBefore(text: string, match: number): number {
  const space = text.indexOf(' ', match - textBeforeMatch)
  return space === -1 || space >= match ? match - textBeforeMatch : space + 1
}

import { type Token } from 'markdown-it'
import { uniqueHeadingId, type Heading } from './page-headings'
import { pageMarkdownParser } from './page-markdown-parser'

// The index page is the introduction of the scratch pad. The server shows the title of index.md
// first. Under the title, the server adds an "Introduction" heading with the rest of index.md.
// After the introduction, it adds a "Table of contents" heading for the list of pages. The agent
// never writes these 2 headings. A heading that the agent writes in index.md is shown one level
// lower so that the heading is still part of the introduction. The id of an agent's heading
// doesn't change so that a link to the heading still works. If the agent has written a heading
// with the same id as one of the 2 headings, the next free id will be used for the server's
// heading instead.
export const indexPage = 'pages/index.md'

export interface PageLayout {
  readonly html: string
  readonly headings: readonly Heading[]
}

export function plainLayout(tokens: readonly Token[], headings: readonly Heading[]): PageLayout {
  return { html: htmlOf(tokens), headings }
}

function htmlOf(tokens: readonly Token[]): string {
  return pageMarkdownParser.renderer.render([...tokens], pageMarkdownParser.options, {})
}

// The title is the first heading of level 1, like the title of the page in the list of pages.
function titleIndexOf(headings: readonly Heading[]): number {
  return headings.findIndex((heading) => heading.level === 1)
}

// A heading of level 1 that isn't the title is shown at level 3 as well. The lowest level in
// HTML is 6.
function shownLevel(level: number): number {
  return Math.min(6, Math.max(level, 2) + 1)
}

// The headings of a page at the levels that the browser shows them. The levels only differ on
// the index page.
export function shownHeadings(page: string, headings: readonly Heading[]): Heading[] {
  if (page !== indexPage) {
    return [...headings]
  }
  const title = titleIndexOf(headings)
  return headings.map((heading, index) =>
    index === title ? heading : { ...heading, level: shownLevel(heading.level) },
  )
}

function addedHeading(text: string, line: number, headings: readonly Heading[]): Heading {
  return { level: 2, text, id: uniqueHeadingId(text, headings), line }
}

function headingHtml(heading: Heading): string {
  return `<h2 id="${heading.id}">${heading.text}</h2>\n`
}

// The 2 headings that the server adds aren't in index.md so they don't have any data-lines.
// That's why Nick can't comment on them. The line of the "Introduction" heading is the line after
// the title. The line of the "Table of contents" heading is the line after the end of index.md.
// markdown-it always puts the inline token of a heading between its opening and closing tokens.
export function indexLayout(
  tokens: readonly Token[],
  headings: readonly Heading[],
  lineCount: number,
): PageLayout {
  const shown = shownHeadings(indexPage, headings)
  const opening = tokens.flatMap((token, index) => (token.type === 'heading_open' ? [index] : []))
  opening.forEach((index, heading) => {
    const tag = `h${String(shown[heading]?.level)}`
    for (const token of tokens.slice(index, index + 3).filter((each) => each.nesting !== 0)) {
      token.tag = tag
    }
  })
  const title = titleIndexOf(headings)
  const titleHeading = headings[title]
  const split = titleHeading === undefined ? 0 : Number(opening[title]) + 3
  const introduction = addedHeading('Introduction', (titleHeading?.line ?? 0) + 1, headings)
  const tableOfContents = addedHeading('Table of contents', lineCount + 1, headings)
  return {
    html: [
      htmlOf(tokens.slice(0, split)),
      headingHtml(introduction),
      htmlOf(tokens.slice(split)),
      headingHtml(tableOfContents),
    ].join(''),
    headings: [
      ...shown.slice(0, title + 1),
      introduction,
      ...shown.slice(title + 1),
      tableOfContents,
    ],
  }
}
